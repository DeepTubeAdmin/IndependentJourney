-- =============================================================================
-- Browsing / preview / interest / share-link tests (Phase 5).
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000011', 's1@test', '{"role":"surrogate"}'),        -- complete, public previews, verified
  ('00000000-0000-0000-0000-000000000012', 's2@test', '{"role":"surrogate"}'),        -- complete, members only
  ('00000000-0000-0000-0000-000000000013', 's3@test', '{"role":"surrogate"}'),        -- complete but suspended
  ('00000000-0000-0000-0000-000000000014', 's4@test', '{"role":"surrogate"}'),        -- brand new, incomplete
  ('00000000-0000-0000-0000-000000000021', 'ip1@test', '{"role":"intended_parent"}'), -- complete, public previews
  ('00000000-0000-0000-0000-000000000022', 'ip2@test', '{"role":"intended_parent"}'), -- incomplete (free browsing IP)
  ('00000000-0000-0000-0000-00000000009a', 'admin@test', '{"role":"intended_parent"}');
insert into public.admin_roles (user_id) values ('00000000-0000-0000-0000-00000000009a');

-- Helper to complete a surrogate quickly.
create or replace function pg_temp.complete_surrogate(uid uuid, nm text, vis public.visibility) returns void language plpgsql as $$
begin
  update public.profiles set display_name=nm, last_initial='R', state='TX', bio='Hello there', visibility=vis where id=uid;
  update public.profile_private set date_of_birth='1994-01-01', city='Austin', phone='5125551234' where id=uid;
  update public.surrogate_details set willing_to_travel='yes', us_resident=true, relationship_status='married', has_health_insurance='yes',
    compensation_open=true, open_to_twins='comfortable', termination_comfort='comfortable', relationship_level='regular_updates',
    carry_donor_embryos='yes', earliest_start='2027-03-01' where id=uid;
  update public.health_self_reports set prior_births=2, prior_pregnancies_uncomplicated='yes', lifestyle_attestation=true, condition_affecting_pregnancy='no' where id=uid;
  insert into public.photos (profile_id, storage_path, position) values (uid, uid::text||'/a.jpg', 0), (uid, uid::text||'/b.jpg', 1), (uid, uid::text||'/c.jpg', 2);
end $$;
select pg_temp.complete_surrogate('00000000-0000-0000-0000-000000000011', 'Megan', 'public_previews');
select pg_temp.complete_surrogate('00000000-0000-0000-0000-000000000012', 'Brooke', 'members_only');
select pg_temp.complete_surrogate('00000000-0000-0000-0000-000000000013', 'Suspended Sue', 'public_previews');
update public.profiles set is_verified = true, verified_at = now() where id = '00000000-0000-0000-0000-000000000011';
update public.profiles set suspended_until = now() + interval '7 days' where id = '00000000-0000-0000-0000-000000000013';

-- Complete IP ip1 with public previews.
update public.profiles set display_name='Daniel & Luis', state='CO', bio='Hi', visibility='public_previews' where id='00000000-0000-0000-0000-000000000021';
update public.profile_private set city='Denver', phone='3035551234' where id='00000000-0000-0000-0000-000000000021';
update public.ip_details set family_structure='couple', embryos_status='created', clinic_name='CCRM', children_hoped_for='1',
  open_to_twins='comfortable', desired_start='2027-01-01', relationship_level='close', termination_comfort='comfortable',
  consulted_attorney=true, budget_range='150_200k', aware_of_birth_state_law=true where id='00000000-0000-0000-0000-000000000021';
insert into public.ip_parents (profile_id, position, first_name, age) values ('00000000-0000-0000-0000-000000000021', 1, 'Daniel', 38);
insert into public.photos (profile_id, storage_path, position) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021/a.jpg', 0),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021/b.jpg', 1),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021/c.jpg', 2);

create or replace function pg_temp.login(uid text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Anonymous: only opted-in live profiles (Megan + Daniel & Luis), never the suspended one, max 5.
select pg_temp.anon();
do $$ begin
  assert (select count(*) from public.browse_profiles('{}', 50, 0)) = 2, 'anon sees exactly the 2 opted-in live profiles';
  assert not exists (select 1 from public.browse_profiles('{}') where display_name = 'Brooke'), 'anon never sees members-only profiles';
  assert not exists (select 1 from public.browse_profiles('{}') where display_name like 'Suspended%'), 'anon never sees suspended profiles';
  assert (select count(*) from public.profiles) = 0, 'anon cannot read the profiles table directly';
  assert (select count(*) from public.featured_profiles()) = 0, 'nobody opted in to featured yet';
end $$;
reset role;
update public.profiles set featured_opt_in = true where id in ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012');
select pg_temp.anon();
do $$ begin
  assert (select count(*) from public.featured_profiles()) = 1, 'only verified + opted-in + public profiles are featured';
end $$;

-- Free IP (incomplete profile): previews of surrogates only, no full details, no interest.
select pg_temp.login('00000000-0000-0000-0000-000000000022');
do $$ begin
  assert (select count(*) from public.browse_profiles('{}')) = 2, 'free IP sees the 2 live surrogates (public and members-only)';
  assert not exists (select 1 from public.browse_profiles('{}') where role = 'intended_parent'), 'IP never sees other IPs';
  assert (select id from public.browse_profiles('{}') limit 1) = '00000000-0000-0000-0000-000000000011', 'verified surrogate ranks first';
  assert (select count(*) from public.browse_profiles('{"verified_only": true}')) = 1, 'verified-only filter works';
  assert (select count(*) from public.browse_profiles('{"state": "CO"}')) = 0, 'state filter works';
  assert public.my_access_to('00000000-0000-0000-0000-000000000011') = 'preview', 'free IP gets preview access only';
  assert (select count(*) from public.surrogate_details) = 0, 'free IP cannot read surrogate details';
  begin
    insert into public.interests (from_id, to_id) values ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011');
    raise exception 'free IP must not be able to express interest';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- Admin grants the IP a membership (logged). Now full access + interest.
select pg_temp.login('00000000-0000-0000-0000-00000000009a', 'aal2');
select public.admin_grant_membership('00000000-0000-0000-0000-000000000022', 3, 'testing');
select pg_temp.login('00000000-0000-0000-0000-000000000022');
do $$ begin
  assert public.has_active_membership(), 'membership is active';
  assert public.my_access_to('00000000-0000-0000-0000-000000000011') = 'full', 'member IP gets full access';
  assert (select count(*) from public.surrogate_details) = 2, 'member IP reads surrogate details of live surrogates';
  assert (select count(*) from public.health_self_reports) = 0, 'health reports stay private even for members';
  insert into public.interests (from_id, to_id) values ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011');
  assert (select count(*) from public.interests) = 1, 'member IP expressed interest';
end $$;

-- Surrogate s1 sees the interest, sees IPs only, full IP details (complete surrogate), can create a share link (verified).
select pg_temp.login('00000000-0000-0000-0000-000000000011');
do $$ declare t text; begin
  assert (select count(*) from public.interests where to_id = auth.uid()) = 1, 'surrogate sees interest received';
  assert (select count(*) from public.browse_profiles('{}')) = 1, 'surrogate sees the one live IP';
  assert not exists (select 1 from public.browse_profiles('{}') where role = 'surrogate'), 'surrogate never sees surrogates';
  assert public.my_access_to('00000000-0000-0000-0000-000000000021') = 'full', 'complete surrogate gets full IP access';
  t := public.create_share_link();
  assert length(t) = 32, 'share token created';
  assert public.create_share_link() = t, 'second call returns the same active link';
end $$;

-- Unverified surrogate cannot create a share link, but DOES see full IP profiles (Seth's rule).
select pg_temp.login('00000000-0000-0000-0000-000000000012');
do $$ begin
  assert public.my_access_to('00000000-0000-0000-0000-000000000021') = 'full', 'unverified surrogate still gets full IP access';
  assert (select count(*) from public.ip_details) = 1, 'unverified surrogate reads IP details';
  begin
    perform public.create_share_link();
    raise exception 'unverified member must not get a share link';
  exception when insufficient_privilege then null; end;
end $$;

-- Anyone with the token sees the share view; a revoked link shows nothing.
reset role;
do $$ declare t text; begin
  select token into t from public.share_links where profile_id = '00000000-0000-0000-0000-000000000011';
  perform pg_temp.anon();
  assert (public.share_view(t) ->> 'display_name') = 'Megan', 'share view works for anonymous';
  assert public.share_view(t) ? 'health' = false, 'share view never includes health';
  assert public.share_view('nope') is null, 'bad token returns nothing';
  reset role;
  update public.share_links set revoked_at = now() where token = t;
  perform pg_temp.anon();
  assert public.share_view(t) is null, 'revoked link returns nothing';
end $$;

-- Brand-new incomplete surrogate: full IP profiles, no interest yet (needs a complete profile).
select pg_temp.login('00000000-0000-0000-0000-000000000014');
do $$ begin
  assert public.my_access_to('00000000-0000-0000-0000-000000000021') = 'full', 'incomplete surrogate sees full IP profiles';
  assert (select count(*) from public.browse_profiles('{}')) = 1, 'incomplete surrogate browses IPs';
  begin
    insert into public.interests (from_id, to_id) values ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000021');
    raise exception 'incomplete surrogate must not express interest yet';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

select 'BROWSE RULES OK' as result;
rollback;
