-- =============================================================================
-- Migration 37: one source of truth for "is this profile complete?", and a
-- way to see exactly what is missing.
--
-- The problem: the website decided what to list under "Still needed" by
-- itself, while the database decided separately whether a profile was
-- complete. The two disagreed in a few cases, so a member could fill in
-- everything the page asked for and still be told to finish their profile.
-- The known cases:
--   * A surrogate who chose "I have a range in mind" for compensation and left
--     the (optional) amounts blank was never complete.
--   * A surrogate who answered "No" to the lifestyle statement was never
--     complete, and nothing said why.
--
-- What this does:
--   * profile_missing(id) lists what a profile still needs, by question key.
--     compute_profile_complete(id) is now simply "that list is empty".
--   * The compensation amounts are optional, as the form says.
--   * my_profile_missing(id) lets the member, their agency, or an admin read
--     the list, so the review page and the admin dashboard show the real
--     reason.
--   * Every profile is re-checked once at the end.
-- The rules themselves are otherwise unchanged. Safe to run more than once.
-- =============================================================================

create or replace function public.profile_missing(p_id uuid)
returns text[]
language plpgsql stable security definer set search_path = ''
as $$
declare
  p public.profiles; pp public.profile_private; sd public.surrogate_details;
  h public.health_self_reports; ipd public.ip_details;
  v_managed boolean; v_photos integer; v_bmi_from timestamptz;
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
    if not exists (select 1 from public.ip_parents par where par.profile_id = p_id and par.first_name <> '' and par.age is not null) then
      m := array_append(m, 'parent1_first_name');
    end if;
  end if;
  return m;
end $$;
revoke execute on function public.profile_missing(uuid) from public, anon, authenticated;

-- Complete = nothing missing.
create or replace function public.compute_profile_complete(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select cardinality(public.profile_missing(p_id)) = 0;
$$;

-- What the review page and the admin dashboard call.
create or replace function public.my_profile_missing(p_id uuid default auth.uid())
returns text[]
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not (public.owns_or_manages(p_id) or public.is_admin()) then
    raise exception 'not_your_profile' using errcode = '42501';
  end if;
  return public.profile_missing(p_id);
end $$;
revoke execute on function public.my_profile_missing(uuid) from public, anon;
grant execute on function public.my_profile_missing(uuid) to authenticated;

-- Re-check everyone once. The rules only got looser, so this can make a
-- profile complete but never hides one that was live.
update public.profiles p
   set is_complete = public.compute_profile_complete(p.id), updated_at = now()
 where p.is_complete is distinct from public.compute_profile_complete(p.id);
