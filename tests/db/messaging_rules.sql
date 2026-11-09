-- =============================================================================
-- Messaging tests (Phase 6).
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000011', 's1@test', '{"role":"surrogate"}'),        -- complete, verified
  ('00000000-0000-0000-0000-000000000012', 's2@test', '{"role":"surrogate"}'),        -- complete, unverified
  ('00000000-0000-0000-0000-000000000014', 's4@test', '{"role":"surrogate"}'),        -- incomplete
  ('00000000-0000-0000-0000-000000000021', 'ip1@test', '{"role":"intended_parent"}'), -- complete, no membership
  ('00000000-0000-0000-0000-000000000022', 'ip2@test', '{"role":"intended_parent"}'), -- complete, membership
  ('00000000-0000-0000-0000-00000000009a', 'admin@test', '{"role":"intended_parent"}');
insert into public.admin_roles (user_id) values ('00000000-0000-0000-0000-00000000009a');

create or replace function pg_temp.complete_surrogate(uid uuid, nm text) returns void language plpgsql as $$
begin
  update public.profiles set display_name=nm, last_initial='R', state='TX', bio='Hello there', visibility='members_only' where id=uid;
  update public.profile_private set date_of_birth='1994-01-01', city='Austin', phone='5125551234' where id=uid;
  update public.surrogate_details set willing_to_travel='yes', us_resident=true, relationship_status='married', has_health_insurance='yes',
    compensation_open=true, open_to_twins='comfortable', termination_comfort='comfortable', relationship_level='regular_updates',
    carry_donor_embryos='yes', earliest_start='2027-03-01' where id=uid;
  update public.health_self_reports set prior_births=2, prior_pregnancies_uncomplicated='yes', lifestyle_attestation=true, condition_affecting_pregnancy='no' where id=uid;
  insert into public.photos (profile_id, storage_path, position) values (uid, uid::text||'/a.jpg', 0), (uid, uid::text||'/b.jpg', 1), (uid, uid::text||'/c.jpg', 2);
end $$;
create or replace function pg_temp.complete_ip(uid uuid, nm text) returns void language plpgsql as $$
begin
  update public.profiles set display_name=nm, state='CO', bio='Hi', visibility='members_only' where id=uid;
  update public.profile_private set city='Denver', phone='3035551234' where id=uid;
  update public.ip_details set family_structure='couple', embryos_status='created', clinic_name='CCRM', children_hoped_for='1',
    open_to_twins='comfortable', desired_start='2027-01-01', relationship_level='close', termination_comfort='comfortable',
    consulted_attorney=true, budget_range='150_200k', aware_of_birth_state_law=true where id=uid;
  insert into public.ip_parents (profile_id, position, first_name, age) values (uid, 1, 'Dan', 38);
  insert into public.photos (profile_id, storage_path, position) values (uid, uid::text||'/a.jpg', 0), (uid, uid::text||'/b.jpg', 1), (uid, uid::text||'/c.jpg', 2);
end $$;
select pg_temp.complete_surrogate('00000000-0000-0000-0000-000000000011', 'Megan');
select pg_temp.complete_surrogate('00000000-0000-0000-0000-000000000012', 'Brooke');
select pg_temp.complete_ip('00000000-0000-0000-0000-000000000021', 'Daniel & Luis');
select pg_temp.complete_ip('00000000-0000-0000-0000-000000000022', 'Priya');
update public.profiles set is_verified = true, verified_at = now() where id = '00000000-0000-0000-0000-000000000011';
insert into public.memberships (user_id, status, current_period_end) values ('00000000-0000-0000-0000-000000000022', 'active', now() + interval '90 days');

create or replace function pg_temp.login(uid text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- can_message reasons -----------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000014');
do $$ begin
  assert public.can_message('00000000-0000-0000-0000-000000000021') = 'profile_incomplete', 'incomplete surrogate cannot message yet';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ begin
  assert public.can_message('00000000-0000-0000-0000-000000000011') = 'membership_required', 'free IP needs a membership';
  assert public.can_message('00000000-0000-0000-0000-000000000022') = 'same_role', 'IP cannot message IP';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000011');
do $$ begin
  assert public.can_message('00000000-0000-0000-0000-000000000021') = 'ok', 'complete surrogate can message a free IP';
  assert public.can_message('00000000-0000-0000-0000-000000000012') = 'same_role', 'surrogate cannot message surrogate';
end $$;

-- Surrogate -> free IP: delivered but locked ---------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000011');
do $$ declare r jsonb; begin
  r := public.send_message('00000000-0000-0000-0000-000000000021', 'Hi Daniel and Luis, I loved reading your story.');
  assert r ->> 'status' = 'locked', 'message to free IP is locked, got ' || (r ->> 'status');
  assert (r -> 'flags') = '[]'::jsonb, 'no flags on a normal message';
  assert (select count(*) from public.my_conversations()) = 1, 'sender sees the conversation';
  assert (select count(*) from public.messages) = 1, 'sender reads own message';
end $$;

-- Free IP: sees the conversation, locked, no text ------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ declare c record; begin
  select * into c from public.my_conversations();
  assert c.locked, 'free IP sees the conversation as locked';
  assert c.last_preview is null, 'free IP cannot see message text in the inbox';
  assert c.unread = 1, 'free IP sees one unread (locked) message';
  assert c.other_name = 'Megan', 'free IP sees the sender preview name';
  assert (select count(*) from public.messages) = 0, 'free IP cannot read incoming messages';
  assert public.my_unread_count() = 1, 'unread badge counts locked messages';
  perform public.mark_conversation_read(c.conversation_id);
  assert public.my_unread_count() = 1, 'locked messages cannot be marked read';
end $$;

-- Membership granted (admin) -> everything unlocks -----------------------------
reset role;
insert into public.memberships (user_id, status, current_period_end) values ('00000000-0000-0000-0000-000000000021', 'active', now() + interval '90 days');
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ declare c record; r jsonb; begin
  select * into c from public.my_conversations();
  assert not c.locked and c.last_preview like 'Hi Daniel%', 'member IP reads the message';
  assert (select count(*) from public.messages) = 1, 'member IP reads incoming messages via RLS';
  perform public.mark_conversation_read(c.conversation_id);
  assert public.my_unread_count() = 0, 'read';
  r := public.send_message('00000000-0000-0000-0000-000000000011', 'Thank you Megan! We would love to talk.');
  assert r ->> 'status' = 'delivered' and (r ->> 'new_conversation')::boolean = false, 'reply goes into the same conversation';
end $$;

-- Scam scan -----------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ declare r jsonb; begin
  r := public.send_message('00000000-0000-0000-0000-000000000022', 'Hello! Before we talk, please send me the money for a processing fee via Zelle.');
  assert (r -> 'flags') ? 'money_request', 'money request is flagged';
  assert (select count(*) from public.messages where sender_id = auth.uid() and 'money_request' = any (scam_flags)) = 1, 'flag stored on message';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.member_flags where profile_id = '00000000-0000-0000-0000-000000000012' and kind = 'fraud_suspected' and cleared_at is null) = 1, 'sender flagged for admins';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ declare r jsonb; begin
  r := public.send_message('00000000-0000-0000-0000-000000000022', 'Also text me at (512) 555-1234 or on WhatsApp.');
  assert (r -> 'flags') ? 'early_contact_info', 'early contact info is flagged';
end $$;

-- Daily new-conversation limit (unverified surrogate: 3) ------------------------
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000023', 'ip3@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000024', 'ip4@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000025', 'ip5@test', '{"role":"intended_parent"}');
select pg_temp.complete_ip('00000000-0000-0000-0000-000000000023', 'A');
select pg_temp.complete_ip('00000000-0000-0000-0000-000000000024', 'B');
select pg_temp.complete_ip('00000000-0000-0000-0000-000000000025', 'C');
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ begin
  perform public.send_message('00000000-0000-0000-0000-000000000023', 'Hello A');
  perform public.send_message('00000000-0000-0000-0000-000000000024', 'Hello B');
  begin
    perform public.send_message('00000000-0000-0000-0000-000000000025', 'Hello C');
    raise exception 'fourth new conversation in a day should be refused';
  exception when insufficient_privilege then
    assert sqlerrm = 'daily_conversation_limit', 'reason is the daily limit, got ' || sqlerrm;
  end;
  -- Existing conversations are not limited.
  perform public.send_message('00000000-0000-0000-0000-000000000023', 'Hello again A');
end $$;

-- Block ----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000022');
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012');
do $$ begin
  assert public.can_message('00000000-0000-0000-0000-000000000012') = 'blocked', 'blocker cannot message';
  assert (select blocked from public.my_conversations() where other_id = '00000000-0000-0000-0000-000000000012'), 'inbox shows blocked';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ begin
  assert public.can_message('00000000-0000-0000-0000-000000000022') = 'blocked', 'blocked member cannot message either';
  begin
    perform public.send_message('00000000-0000-0000-0000-000000000022', 'Still there?');
    raise exception 'blocked send should fail';
  exception when insufficient_privilege then null; end;
end $$;

-- Health sharing -------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ begin
  assert (select count(*) from public.health_self_reports where id = '00000000-0000-0000-0000-000000000011') = 0, 'health not visible before sharing';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000011');
insert into public.health_shares (owner_id, viewer_id) values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021');
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ begin
  assert (select count(*) from public.health_self_reports where id = '00000000-0000-0000-0000-000000000011') = 1, 'health visible after the surrogate shares it';
end $$;

-- Admin review is logged; non-admin refused ------------------------------------
select pg_temp.login('00000000-0000-0000-0000-000000000021');
do $$ begin
  begin
    perform public.admin_search_messages('zelle');
    raise exception 'member must not search messages';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000009a', 'aal2');
do $$ declare n integer; conv uuid; j jsonb; begin
  select count(*) into n from public.admin_search_messages('zelle');
  assert n = 1, 'admin finds the zelle message';
  select count(*) into n from public.admin_search_messages('', null, true);
  assert n = 2, 'admin finds both flagged messages, got ' || n;
  select conversation_id into conv from public.admin_search_messages('zelle');
  j := public.admin_conversation(conv);
  assert jsonb_array_length(j -> 'messages') = 2, 'admin reads the whole conversation';
  assert (select count(*) from public.admin_audit_log where action in ('message_search', 'message_review')) >= 4, 'every admin message access is logged';
  perform public.admin_hide_message((j -> 'messages' -> 0 ->> 'id')::bigint, true, 'scam');
  perform public.admin_warn_member('00000000-0000-0000-0000-000000000012', 'Asking for money is not allowed here.', 'scam message');
  assert (select count(*) from public.admin_audit_log where action in ('hide_message', 'warn_member')) = 2, 'hide and warn are logged';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000022');
do $$ begin
  assert (select count(*) from public.messages where 'money_request' = any (scam_flags)) = 0, 'hidden message is gone for the recipient';
end $$;
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ begin
  assert (select count(*) from public.member_notices where seen_at is null) = 1, 'warned member sees the notice';
end $$;

select 'MESSAGING RULES OK' as result;
rollback;
