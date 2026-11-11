-- =============================================================================
-- Social sign-in tests (Phase: Google/Apple login). Run after the migrations.
-- A login created without a role (Google/Apple) gets no profile until
-- complete_signup() runs; email sign-ups still get one straight away.
-- =============================================================================
begin;

create or replace function pg_temp.login(uid text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- Email sign-up: profile and consents created by the trigger as before.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'email@test', '{"role":"surrogate","attested_individual":true,"attested_age":true,"legal_version":"v1"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'google@test', '{"iss":"https://accounts.google.com","email_verified":true}');
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000e1') = 'surrogate', 'email sign-up gets a profile';
  assert (select count(*) from public.consents where user_id = '00000000-0000-0000-0000-0000000000e1') = 4, 'email sign-up records consents';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'), 'social sign-up has no profile yet';
  assert not exists (select 1 from public.consents where user_id = '00000000-0000-0000-0000-0000000000e2'), 'social sign-up has no consents yet';
end $$;

-- The social member finishes sign-up as an intended parent.
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
select public.complete_signup('intended_parent', 'v1');
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000e2') = 'intended_parent', 'complete_signup creates the profile';
  assert (select attested_individual and attested_age from public.profile_private where id = '00000000-0000-0000-0000-0000000000e2'), 'attestations recorded';
  assert (select count(*) from public.consents where user_id = '00000000-0000-0000-0000-0000000000e2' and version = 'v1') = 4, 'consents recorded';
  assert exists (select 1 from public.ip_details where id = '00000000-0000-0000-0000-0000000000e2'), 'role tables created';
  begin
    perform public.complete_signup('surrogate', 'v1');
    raise exception 'second complete_signup must be refused';
  exception when unique_violation then null; end;
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000e2') = 'intended_parent', 'role cannot be switched afterwards';
end $$;

-- Anonymous visitors cannot call it at all.
reset role;
do $$ begin
  assert not has_function_privilege('anon', 'public.complete_signup(public.user_role, text)', 'execute'), 'anon cannot complete sign-up';
  assert not has_function_privilege('authenticated', 'public.create_profile_rows(uuid, public.user_role, boolean, boolean, text)', 'execute'), 'helper is internal';
end $$;

rollback;
select 'SOCIAL RULES OK' as result;
