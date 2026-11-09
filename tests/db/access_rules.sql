-- =============================================================================
-- Access-rule tests. Run against a database that has the migrations applied:
--   psql -v ON_ERROR_STOP=1 -f tests/db/access_rules.sql
-- Each block impersonates a user the way Supabase does (role + JWT claims)
-- and asserts what they can and cannot see. Fails loudly on any mismatch.
-- =============================================================================
begin;

-- Two surrogates and two IPs. The auth trigger creates their profile rows.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 's1@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-000000000002', 's2@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-000000000003', 'ip1@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000004', 'ip2@test', '{"role":"intended_parent"}');

-- Make s1 and ip1 "complete" by filling required answers and 3 photos.
update public.profiles set display_name='Megan', last_initial='R', state='TX', bio='Hi' where id='00000000-0000-0000-0000-000000000001';
update public.profile_private set date_of_birth='1994-01-01', city='Austin', phone='5125551234' where id='00000000-0000-0000-0000-000000000001';
update public.surrogate_details set willing_to_travel='yes', us_resident=true, relationship_status='married', has_health_insurance='yes',
  compensation_open=true, open_to_twins='comfortable', termination_comfort='comfortable', relationship_level='regular_updates',
  carry_donor_embryos='yes', earliest_start='2027-03-01' where id='00000000-0000-0000-0000-000000000001';
update public.health_self_reports set prior_births=2, prior_pregnancies_uncomplicated='yes', lifestyle_attestation=true,
  condition_affecting_pregnancy='no' where id='00000000-0000-0000-0000-000000000001';
insert into public.photos (profile_id, storage_path, position) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001/a.jpg', 0),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001/b.jpg', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001/c.jpg', 2);

update public.profiles set display_name='Daniel & Luis', state='CO', bio='Hi' where id='00000000-0000-0000-0000-000000000003';
update public.profile_private set city='Denver', phone='3035551234' where id='00000000-0000-0000-0000-000000000003';
update public.ip_details set family_structure='couple', embryos_status='created', clinic_name='CCRM', children_hoped_for='1',
  open_to_twins='comfortable', desired_start='2027-01-01', relationship_level='close', termination_comfort='comfortable',
  consulted_attorney=true, budget_range='150_200k', aware_of_birth_state_law=true where id='00000000-0000-0000-0000-000000000003';
insert into public.ip_parents (profile_id, position, first_name, age) values ('00000000-0000-0000-0000-000000000003', 1, 'Daniel', 38);
insert into public.photos (profile_id, storage_path, position) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003/a.jpg', 0),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003/b.jpg', 1),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003/c.jpg', 2);

do $$ begin
  assert (select is_complete from public.profiles where id='00000000-0000-0000-0000-000000000001'), 'surrogate s1 should be complete';
  assert (select is_complete from public.profiles where id='00000000-0000-0000-0000-000000000003'), 'IP ip1 should be complete';
  assert not (select is_complete from public.profiles where id='00000000-0000-0000-0000-000000000002'), 's2 should be incomplete';
end $$;

-- Helper: impersonate a user
create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;

-- As complete surrogate s1: sees IPs only (complete ones), full IP details, never other surrogates.
select pg_temp.login('00000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.profiles where id <> auth.uid()) = 1, 's1 should see exactly one other profile (ip1)';
  assert (select role from public.profiles where id <> auth.uid()) = 'intended_parent', 's1 must not see surrogates';
  assert (select count(*) from public.ip_details) = 1, 's1 (complete) sees full IP details';
  assert (select count(*) from public.health_self_reports) = 1, 's1 sees only her own health report';
  assert (select count(*) from public.profile_private) = 1, 's1 sees only her own private row';
end $$;
reset role;

-- As incomplete surrogate s2: sees IP previews, but NOT full IP details.
select pg_temp.login('00000000-0000-0000-0000-000000000002');
do $$ begin
  assert (select count(*) from public.profiles where id <> auth.uid()) = 1, 's2 sees ip1 preview';
  assert (select count(*) from public.ip_details) = 0, 's2 (incomplete) must not see full IP details';
end $$;
reset role;

-- As IP ip1 (no membership): sees surrogate previews, NOT surrogate details, never other IPs.
select pg_temp.login('00000000-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from public.profiles where id <> auth.uid()) = 1, 'ip1 sees exactly one other profile (s1)';
  assert (select role from public.profiles where id <> auth.uid()) = 'surrogate', 'ip1 must not see other IPs';
  assert (select count(*) from public.surrogate_details) = 0, 'ip1 without membership must not see surrogate details';
  assert (select count(*) from public.health_self_reports) = 0, 'ip1 must never see health reports';
  assert (select count(*) from public.photos where profile_id <> auth.uid()) = 3, 'ip1 sees s1 photos (blur is applied in the app)';
end $$;
-- ip1 cannot verify themselves or change role
do $$ begin
  update public.profiles set is_verified = true where id = auth.uid();
  raise exception 'ip1 should not be able to self-verify';
exception when others then
  if sqlerrm like '%self-verify%' then raise; end if;
end $$;
reset role;

-- Anonymous: sees nothing from profiles (public previews come via a view in Phase 5).
set local role anon;
do $$ begin
  assert (select count(*) from public.profiles) = 0, 'anon must not read profiles directly';
  assert (select count(*) from public.app_settings) > 0, 'anon can read settings';
end $$;
reset role;

select 'ACCESS RULES OK' as result;
rollback;
