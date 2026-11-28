-- =============================================================================
-- Migration 41 tests: the "finish your profile" reminder.
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'old-unfinished@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'new-unfinished@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'optedout@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'unconfirmed@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-0000000000b5', 'banned@test', '{"role":"surrogate"}');

do $$
declare b1 uuid := '00000000-0000-0000-0000-0000000000b1'; n integer;
begin
  delete from public.email_outbox;
  update public.profiles set created_at = now() - interval '3 days' where id::text like '00000000-0000-0000-0000-0000000000b%';
  update public.profiles set created_at = now() - interval '1 day' where id = '00000000-0000-0000-0000-0000000000b2';
  insert into public.notification_settings (user_id, nudges) values ('00000000-0000-0000-0000-0000000000b3', false)
    on conflict (user_id) do update set nudges = false;
  update auth.users set email_confirmed_at = null where id = '00000000-0000-0000-0000-0000000000b4';
  update public.profiles set banned_at = now() where id = '00000000-0000-0000-0000-0000000000b5';

  n := public.enqueue_profile_nudges();
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id = b1) = 1, 'unfinished for 3 days: reminded';
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id <> b1
            and user_id::text like '00000000-0000-0000-0000-0000000000b%') = 0,
         'not reminded: joined yesterday, opted out, unconfirmed email, banned';
  assert (select (payload ->> 'last')::boolean = false and payload ->> 'role' = 'surrogate' from public.email_outbox where user_id = b1 and template = 'profile_nudge'), 'first reminder payload';

  perform public.enqueue_profile_nudges();
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id = b1) = 1, 'no second reminder straight away';

  update public.email_outbox set created_at = now() - interval '8 days' where template = 'profile_nudge';
  perform public.enqueue_profile_nudges();
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id = b1) = 2, 'second reminder a week later';
  assert (select bool_or((payload ->> 'last')::boolean) from public.email_outbox where user_id = b1 and template = 'profile_nudge'), 'second one is marked last';

  update public.email_outbox set created_at = now() - interval '30 days' where template = 'profile_nudge';
  perform public.enqueue_profile_nudges();
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id = b1) = 2, 'never a third';

  -- Daily cap, and 0 switches it off.
  delete from public.email_outbox where template = 'profile_nudge';
  update public.app_settings set value = '0' where key = 'profile_nudge_daily_cap';
  assert public.enqueue_profile_nudges() = 0, 'cap 0: nothing queued';
  assert (select count(*) from public.email_outbox where template = 'profile_nudge') = 0, 'cap 0: outbox empty';

  -- A finished profile is never reminded.
  update public.app_settings set value = '30' where key = 'profile_nudge_daily_cap';
  alter table public.profiles disable trigger profiles_complete;
  update public.profiles set is_complete = true where id = b1;
  alter table public.profiles enable trigger profiles_complete;
  perform public.enqueue_profile_nudges();
  assert (select count(*) from public.email_outbox where template = 'profile_nudge' and user_id = b1) = 0, 'complete profile: no reminder';
  assert not has_function_privilege('authenticated', 'public.enqueue_profile_nudges()', 'execute'), 'members cannot trigger it';
end $$;

rollback;
select 'PROFILE NUDGE RULES OK' as result;
