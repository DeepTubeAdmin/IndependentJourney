-- =============================================================================
-- Migration 39: new question for intended parents,
--   "Does your fertility center require the surrogate to have the COVID vaccine?"
--   (Yes / No / Not sure)
--
-- It is required for intended parents who join from now on. Intended parents
-- who joined before this migration was first run keep their complete profile;
-- they see the question the next time they edit that section.
-- Safe to run more than once.
-- =============================================================================

alter table public.ip_details
  add column if not exists clinic_requires_covid_vaccine text not null default ''
    check (clinic_requires_covid_vaccine in ('', 'yes', 'no', 'not_sure'));
comment on column public.ip_details.clinic_requires_covid_vaccine is 'Fertility center requires the surrogate to have the COVID vaccine (yes / no / not sure).';

-- Remembers the moment this was first run. Running the migration again keeps
-- the original moment.
insert into public.app_settings (key, value, description)
values ('clinic_covid_required_from', to_jsonb(now()),
        'Intended parents who joined after this moment must answer the fertility-center COVID vaccine question before their profile is complete. Set by migration 39; do not change.')
on conflict (key) do nothing;

create or replace function public.profile_missing(p_id uuid)
returns text[]
language plpgsql stable security definer set search_path = ''
as $$
declare
  p public.profiles; pp public.profile_private; sd public.surrogate_details;
  h public.health_self_reports; ipd public.ip_details;
  v_managed boolean; v_photos integer; v_bmi_from timestamptz; v_covid_from timestamptz;
  m text[] := '{}';
begin
  select * into p from public.profiles where id = p_id;
  if p.id is null then return array['profile']; end if;
  select * into pp from public.profile_private where id = p_id;
  v_managed := p.managed_by is not null;

  select count(*) into v_photos from public.photos where profile_id = p_id;
  if v_photos < 3 then m := array_append(m, 'photos'); end if;
  if coalesce(p.bio, '') = '' then m := array_append(m, 'bio'); end if;
  if coalesce(p.display_name, '') = '' then m := array_append(m, 'display_name'); end if;
  if coalesce(pp.city, '') = '' then m := array_append(m, 'city'); end if;
  if not v_managed and coalesce(pp.phone, '') = '' then m := array_append(m, 'phone'); end if;

  if p.role = 'surrogate' then
    select * into sd from public.surrogate_details where id = p_id;
    select * into h from public.health_self_reports where id = p_id;
    if coalesce(p.last_initial, '') = '' then m := array_append(m, 'last_name'); end if;
    if coalesce(p.state, '') = '' then m := array_append(m, 'state'); end if;
    if pp.date_of_birth is null then m := array_append(m, 'date_of_birth'); end if;
    if sd.willing_to_travel is null then m := array_append(m, 'willing_to_travel'); end if;
    if sd.us_resident is null then m := array_append(m, 'us_resident'); end if;
    if coalesce(sd.relationship_status, '') = '' then m := array_append(m, 'relationship_status'); end if;
    if sd.has_health_insurance is null then m := array_append(m, 'has_health_insurance'); end if;
    if sd.open_to_twins is null then m := array_append(m, 'open_to_twins'); end if;
    if sd.termination_comfort is null then m := array_append(m, 'termination_comfort'); end if;
    if sd.relationship_level is null then m := array_append(m, 'relationship_level'); end if;
    if sd.carry_donor_embryos is null then m := array_append(m, 'carry_donor_embryos'); end if;
    if sd.earliest_start is null then m := array_append(m, 'earliest_start'); end if;
    if v_managed then
      -- Agency client profiles have no health section; they answer the clearance questions.
      if coalesce(sd.ob_cleared, '') = '' then m := array_append(m, 'ob_cleared'); end if;
      if coalesce(sd.clinic_cleared, '') = '' then m := array_append(m, 'clinic_cleared'); end if;
    else
      if h.prior_births is null then m := array_append(m, 'prior_births'); end if;
      if h.prior_pregnancies_uncomplicated is null then m := array_append(m, 'prior_pregnancies_uncomplicated'); end if;
      if h.condition_affecting_pregnancy is null then m := array_append(m, 'condition_affecting_pregnancy'); end if;
      -- Unanswered and "No" are told apart so the page can explain a "No".
      if h.lifestyle_attestation is null then m := array_append(m, 'lifestyle_attestation');
      elsif h.lifestyle_attestation is false then m := array_append(m, 'lifestyle_attestation_no');
      end if;
      -- BMI is required for surrogates who joined after migration 36 was run.
      select (s.value #>> '{}')::timestamptz into v_bmi_from from public.app_settings s where s.key = 'bmi_required_from';
      if coalesce(h.bmi_range, '') = '' and p.created_at >= coalesce(v_bmi_from, 'infinity'::timestamptz) then
        m := array_append(m, 'bmi_range');
      end if;
    end if;
  else
    select * into ipd from public.ip_details where id = p_id;
    -- Parents abroad have no US state.
    if coalesce(p.state, '') = '' and coalesce(p.country, 'US') = 'US' then m := array_append(m, 'state'); end if;
    if coalesce(ipd.family_structure, '') = '' then m := array_append(m, 'family_structure'); end if;
    if ipd.embryos_status is null then m := array_append(m, 'embryos_status'); end if;
    if ipd.open_to_twins is null then m := array_append(m, 'open_to_twins'); end if;
    if ipd.desired_start is null then m := array_append(m, 'desired_start'); end if;
    if ipd.relationship_level is null then m := array_append(m, 'relationship_level'); end if;
    if ipd.termination_comfort is null then m := array_append(m, 'termination_comfort'); end if;
    if ipd.consulted_attorney is null then m := array_append(m, 'consulted_attorney'); end if;
    if coalesce(ipd.budget_range, '') = '' then m := array_append(m, 'budget_range'); end if;
    if ipd.aware_of_birth_state_law is null then m := array_append(m, 'aware_of_birth_state_law'); end if;
    -- Required for intended parents who joined after migration 39 was run.
    select (s.value #>> '{}')::timestamptz into v_covid_from from public.app_settings s where s.key = 'clinic_covid_required_from';
    if coalesce(ipd.clinic_requires_covid_vaccine, '') = '' and p.created_at >= coalesce(v_covid_from, 'infinity'::timestamptz) then
      m := array_append(m, 'clinic_requires_covid_vaccine');
    end if;
    if not exists (select 1 from public.ip_parents par where par.profile_id = p_id and par.first_name <> '' and par.age is not null) then
      m := array_append(m, 'parent1_first_name');
    end if;
  end if;
  return m;
end $$;
revoke execute on function public.profile_missing(uuid) from public, anon, authenticated;
