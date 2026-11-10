-- =============================================================================
-- Email notification tests (Phase 8a): outbox, preferences, saved searches.
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000081', 'mailip@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000082', 'mailsur@test', '{"role":"surrogate"}');

create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create or replace function pg_temp.server() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function pg_temp.admin_mode() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;

do $$
declare ip text := '00000000-0000-0000-0000-000000000081'; sur text := '00000000-0000-0000-0000-000000000082';
        conv uuid; n integer; r record;
begin
  perform pg_temp.admin_mode();
  -- Signing up queues a welcome email, once.
  assert (select count(*) from public.email_outbox where user_id = ip::uuid and template = 'welcome') = 1, 'welcome email should be queued';

  -- Preferences: default all on; member can switch a category off.
  perform pg_temp.login(ip);
  assert (public.my_notification_settings() ->> 'new_messages')::boolean, 'defaults should be on';
  perform public.set_notification_settings('{"new_messages": false}'::jsonb);
  assert not (public.my_notification_settings() ->> 'new_messages')::boolean, 'setting should save';
  assert (public.my_notification_settings() ->> 'membership')::boolean, 'other settings stay on';

  -- Browsers cannot touch the outbox or the sending functions.
  begin
    perform public.claim_emails(10);
    raise exception 'authenticated could claim emails';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.email_outbox) = 0, 'members should not see the outbox';

  -- A new message queues an email for the other person, unless they opted out.
  perform pg_temp.admin_mode();
  insert into public.conversations (surrogate_id, ip_id, started_by) values (sur::uuid, ip::uuid, sur::uuid) returning id into conv;
  insert into public.messages (conversation_id, sender_id, body) values (conv, sur::uuid, 'Hello there');
  assert (select count(*) from public.email_outbox where user_id = ip::uuid and template in ('new_message', 'locked_message')) = 0, 'opted-out member should get no message email';
  insert into public.messages (conversation_id, sender_id, body) values (conv, ip::uuid, 'Hi back');
  assert (select count(*) from public.email_outbox where user_id = sur::uuid and template = 'new_message') = 1, 'surrogate should get a message email';
  insert into public.messages (conversation_id, sender_id, body) values (conv, ip::uuid, 'And again');
  assert (select count(*) from public.email_outbox where user_id = sur::uuid and template = 'new_message') = 1, 'one message email per conversation per hour';

  -- A Stripe payment queues a receipt; a verified ID check queues a notice.
  perform pg_temp.server();
  perform public.apply_stripe_payment('evt_m1', ip::uuid, 'pi_m1', 'cus_m1', 19900);
  perform public.record_identity_check(ip::uuid, 'vs_m1');
  perform public.apply_identity_result('evt_m2', 'vs_m1', 'verified', null);
  perform pg_temp.admin_mode();
  assert (select count(*) from public.email_outbox where user_id = ip::uuid and template = 'membership_receipt') = 1, 'receipt should be queued';
  assert (select count(*) from public.email_outbox where user_id = ip::uuid and template = 'identity_verified') = 1, 'identity email should be queued';

  -- Membership ending in a week is picked up by the scheduled check, once.
  update public.memberships set current_period_end = now() + interval '7 days' where user_id = ip::uuid;
  perform pg_temp.server();
  perform public.enqueue_membership_reminders();
  perform public.enqueue_membership_reminders();
  perform pg_temp.admin_mode();
  assert (select count(*) from public.email_outbox where user_id = ip::uuid and template = 'membership_ending') = 1, 'ending reminder should be queued once';

  -- The sender claims queued rows (with the address), then marks them.
  perform pg_temp.server();
  select count(*) into n from public.claim_emails(100);
  assert n >= 5, 'claim should return queued rows, got ' || n;
  assert (select count(*) from public.claim_emails(100)) = 0, 'claimed rows should not be claimed twice';
  perform pg_temp.admin_mode();
  assert (select bool_and(status = 'sending') from public.email_outbox), 'claimed rows should be sending';
  select id into r from public.email_outbox where template = 'welcome' and user_id = ip::uuid;
  perform pg_temp.server();
  perform public.mark_email(r.id, true, null);
  perform pg_temp.admin_mode();
  assert (select status = 'sent' and sent_at is not null from public.email_outbox where id = r.id), 'marked row should be sent';
  perform pg_temp.server();
  perform public.mark_email(r.id, false, 'boom');
  perform pg_temp.admin_mode();
  assert (select status = 'queued' from public.email_outbox where id = r.id), 'a failure should requeue until 3 attempts';

  -- Saved searches: own rows only, at most 10, and alerts find new profiles.
  perform pg_temp.login(ip);
  insert into public.saved_searches (user_id, name, filters) values (ip::uuid, 'Texas verified', '{"state": "TX", "verified_only": true}');
  assert (select count(*) from public.saved_searches) = 1, 'member should see own saved search';
  perform pg_temp.login(sur);
  assert (select count(*) from public.saved_searches) = 0, 'other members should not see it';
  perform pg_temp.admin_mode();
  update public.saved_searches set last_run_at = now() - interval '1 day';
  -- Pretend the surrogate finished her profile (the completeness trigger would otherwise undo this).
  alter table public.profiles disable trigger profiles_complete;
  update public.profiles set state = 'TX', is_complete = true, is_verified = true where id = sur::uuid;
  alter table public.profiles enable trigger profiles_complete;
  perform pg_temp.server();
  select public.run_saved_search_alerts() into n;
  assert n = 1, 'one alert should be queued, got ' || n;
  perform pg_temp.admin_mode();
  assert (select (payload ->> 'count')::int = 1 and payload -> 'items' -> 0 ->> 'state' = 'TX'
            from public.email_outbox where template = 'saved_search' and user_id = ip::uuid), 'alert payload should list the match';
  perform pg_temp.server();
  assert public.run_saved_search_alerts() = 0, 'no second alert the same day';
end $$;

rollback;
select 'NOTIFICATION RULES OK' as result;
