-- =============================================================================
-- Migration 38 tests: free access for intended parents, surrogate age on
-- cards, and the age / experience filters.
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'young@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'older@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'freeip@test', '{"role":"intended_parent"}');

create or replace function pg_temp.complete_surrogate(uid uuid, nm text, dob date, journeys integer) returns void language plpgsql as $$
begin
  update public.profiles set display_name=nm, last_initial='R', state='TX', bio='Hello there', headline_tags=array['Open to twins'] where id=uid;
  update public.profile_private set date_of_birth=dob, city='Austin', phone='5125551234' where id=uid;
  update public.surrogate_details set willing_to_travel='yes', us_resident=true, relationship_status='married', has_health_insurance='yes',
    compensation_open=true, open_to_twins='comfortable', termination_comfort='comfortable', relationship_level='regular_updates',
    carry_donor_embryos='yes', earliest_start='2027-03-01', journeys_completed=journeys where id=uid;
  update public.health_self_reports set prior_births=2, prior_pregnancies_uncomplicated='yes', lifestyle_attestation=true, condition_affecting_pregnancy='no' where id=uid;
  insert into public.photos (profile_id, storage_path, position) values (uid, uid::text||'/a.jpg', 0), (uid, uid::text||'/b.jpg', 1), (uid, uid::text||'/c.jpg', 2);
end $$;
-- Birthdays are set relative to today so the ages never drift: 27 (birthday was yesterday) and 38 (turns 39 tomorrow).
select pg_temp.complete_surrogate('00000000-0000-0000-0000-0000000000a1', 'Young', (current_date - interval '27 years' - interval '1 day')::date, 0);
select pg_temp.complete_surrogate('00000000-0000-0000-0000-0000000000a2', 'Older', (current_date - interval '39 years' + interval '1 day')::date, 2);

do $$
declare ip uuid := '00000000-0000-0000-0000-0000000000a3'; r record; n integer;
begin
  -- Free access: off means no access without a membership, on means every joined intended parent has it.
  update public.app_settings set value = 'false' where key = 'free_access';
  assert not public.has_active_membership(ip), 'free access off: no membership, no access';
  update public.app_settings set value = 'true' where key = 'free_access';
  assert public.has_active_membership(ip), 'free access on: joined intended parent has access';
  assert public.member_access(ip), 'member_access follows';
  assert not public.has_active_membership('00000000-0000-0000-0000-0000000000ff'), 'someone who never joined has no access';
  assert public.enqueue_membership_reminders() = 0, 'no reminders while free';

  -- Age is whole years and leads the card highlights.
  assert public.surrogate_age('00000000-0000-0000-0000-0000000000a1') = 27, 'age 27';
  assert public.surrogate_age('00000000-0000-0000-0000-0000000000a2') = 38, 'still 38 the day before the birthday';
  assert public.surrogate_age(ip) is null, 'no age for intended parents';
  select * into r from public.browse_profiles(jsonb_build_object('id', '00000000-0000-0000-0000-0000000000a1'));
  assert r.headline_tags = array['Age 27', 'Open to twins'], 'age leads the highlights: ' || r.headline_tags::text;
  assert (public.profile_full_json((select p from public.profiles p where p.id = '00000000-0000-0000-0000-0000000000a2')) ->> 'age')::integer = 38, 'full profile carries the age';
  assert exists (select 1 from public.featured_profiles(12) f where f.id = '00000000-0000-0000-0000-0000000000a1' and f.headline_tags[1] = 'Age 27'), 'homepage cards too';

  -- Filters.
  select count(*) into n from public.browse_profiles('{"role":"surrogate","age_max":29}') b where b.display_name in ('Young', 'Older');
  assert n = 1, 'age_max 29 keeps only the 27 year old';
  select count(*) into n from public.browse_profiles('{"role":"surrogate","age_min":35,"age_max":39}') b where b.display_name in ('Young', 'Older');
  assert n = 1, '35 to 39 keeps only the 38 year old';
  select count(*) into n from public.browse_profiles('{"role":"surrogate","age_min":21}') b where b.display_name in ('Young', 'Older');
  assert n = 2, '21 and over keeps both';
  assert (select b.display_name from public.browse_profiles('{"role":"surrogate","experience":"first_time"}') b where b.display_name in ('Young', 'Older')) = 'Young', 'first-time';
  assert (select b.display_name from public.browse_profiles('{"role":"surrogate","experience":"experienced"}') b where b.display_name in ('Young', 'Older')) = 'Older', 'experienced';
  assert not has_function_privilege('authenticated', 'public.surrogate_age(uuid)', 'execute'), 'age helper is not callable directly';
end $$;

-- Migration 39: the fertility-center COVID vaccine question is required only for intended parents who join after it was added.
do $$
declare ip uuid := '00000000-0000-0000-0000-0000000000a3';
begin
  update public.app_settings set value = '"infinity"' where key = 'clinic_covid_required_from';
  assert not ('clinic_requires_covid_vaccine' = any (public.profile_missing(ip))), 'earlier members are not asked';
  update public.app_settings set value = '"2000-01-01T00:00:00Z"' where key = 'clinic_covid_required_from';
  assert 'clinic_requires_covid_vaccine' = any (public.profile_missing(ip)), 'new intended parents must answer';
  update public.ip_details set clinic_requires_covid_vaccine = 'not_sure' where id = ip;
  assert not ('clinic_requires_covid_vaccine' = any (public.profile_missing(ip))), 'answered: no longer missing';
end $$;

-- Migration 40: public state pages show two numbers per state and nothing else.
do $$
declare r record; base record;
begin
  select * into r from public.state_member_counts('tx');
  assert r.surrogates >= 2, 'both Texas surrogates are counted: ' || r.surrogates;
  select * into base from public.state_member_counts('TX');
  assert base.surrogates = r.surrogates, 'state code is not case sensitive';
  update public.profiles set banned_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
  select * into r from public.state_member_counts('TX');
  assert r.surrogates = base.surrogates - 1, 'banned members are not counted';
  select * into r from public.state_member_counts('Texas');
  assert r.surrogates = 0 and r.intended_parents = 0, 'anything but a two-letter code counts nothing';
  assert has_function_privilege('anon', 'public.state_member_counts(text)', 'execute'), 'visitors may read the counts';
end $$;

rollback;
select 'FREE ACCESS AND AGE RULES OK' as result;
