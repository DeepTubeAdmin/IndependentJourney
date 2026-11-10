-- =============================================================================
-- Account deletion tests (Phase 9).
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000101', 'delip@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000102', 'delsur@test', '{"role":"surrogate"}');

create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create or replace function pg_temp.admin_mode() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;

do $$
declare ip text := '00000000-0000-0000-0000-000000000101'; sur text := '00000000-0000-0000-0000-000000000102'; conv uuid;
begin
  perform pg_temp.admin_mode();
  insert into public.conversations (surrogate_id, ip_id, started_by) values (sur::uuid, ip::uuid, sur::uuid) returning id into conv;
  insert into public.messages (conversation_id, sender_id, body) values (conv, sur::uuid, 'hi'), (conv, ip::uuid, 'hello');
  insert into public.saved_profiles (user_id, profile_id) values (ip::uuid, sur::uuid);
  insert into storage.objects (bucket_id, name) values ('profile-photos', sur || '/one.jpg');

  -- The surrogate deletes her account.
  perform pg_temp.login(sur);
  perform public.delete_my_account('Found a match');
  perform pg_temp.admin_mode();
  assert not exists (select 1 from auth.users where id = sur::uuid), 'login should be gone';
  assert not exists (select 1 from public.profiles where id = sur::uuid), 'profile should be gone';
  assert not exists (select 1 from public.conversations where id = conv), 'conversation should be gone';
  assert not exists (select 1 from storage.objects where name like sur || '/%'), 'photo files should be gone';
  assert exists (select 1 from public.deleted_accounts where role = 'surrogate' and reason = 'Found a match'), 'deletion should be logged';
  assert exists (select 1 from auth.users where id = ip::uuid), 'other member untouched';
  assert not exists (select 1 from public.saved_profiles where profile_id = sur::uuid), 'saved-profile rows should be gone';

  -- Admins cannot delete themselves here.
  insert into public.admin_roles (user_id) values (ip::uuid);
  perform pg_temp.login(ip);
  begin
    perform public.delete_my_account('');
    raise exception 'admin should not be able to self-delete';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'DELETION RULES OK' as result;
