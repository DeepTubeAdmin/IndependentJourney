-- =============================================================================
-- Migration 35: Browse filters built on the questions that decide a match.
--
-- Adds these filters (all optional; leaving one empty means "any"):
--   Looking at surrogates:
--     experienced            has completed at least one surrogate journey
--     termination_comfort    comfort with termination for medical reasons
--     untested_embryos_ok    willing to use embryos that are not genetically tested
--     carry_donor_embryos    willing to carry embryos made with donor eggs or sperm
--     international_ips_ok   open to intended parents living outside the US
--     comp_max               base compensation starts at or under this amount
--                            (surrogates who are "open to discuss" always match)
--     open_to_ip_type        open to single parents / LGBTQ+ families
--                            (surrogates who left that question blank are open to everyone)
--   Looking at intended parents:
--     embryos_tested         embryos are genetically tested
--     consulted_attorney     has already consulted a reproductive attorney
--     termination_comfort    views on termination for medical reasons
--     open_to_twins          now also works for intended parents
--
-- Nothing from the private health section can be filtered on: those answers
-- stay visible to the member and admins only.
-- The same rules are used for saved-search alerts. Safe to run more than once.
-- =============================================================================

create or replace function public.profile_matches_key_answers(p_id uuid, p_role public.user_role, f jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_role = 'surrogate' then
      not (f ?| array['experienced', 'termination_comfort', 'untested_embryos_ok', 'carry_donor_embryos', 'international_ips_ok', 'comp_max', 'open_to_ip_type'])
      or exists (
        select 1 from public.surrogate_details sd
         where sd.id = p_id
           and (coalesce((f ->> 'experienced')::boolean, false) = false or coalesce(sd.journeys_completed, 0) >= 1)
           and (f ->> 'termination_comfort' is null or sd.termination_comfort::text = f ->> 'termination_comfort')
           and (f ->> 'untested_embryos_ok' is null or sd.untested_embryos_ok = f ->> 'untested_embryos_ok')
           and (f ->> 'carry_donor_embryos' is null or sd.carry_donor_embryos::text = f ->> 'carry_donor_embryos')
           and (f ->> 'international_ips_ok' is null or sd.international_ips_ok = f ->> 'international_ips_ok')
           and (f ->> 'comp_max' is null or sd.compensation_open or sd.compensation_min_usd <= (f ->> 'comp_max')::integer)
           and (f ->> 'open_to_ip_type' is null or cardinality(sd.open_to_ip_types) = 0 or (f ->> 'open_to_ip_type') = any (sd.open_to_ip_types)))
    when p_role = 'intended_parent' then
      not (f ?| array['embryos_tested', 'consulted_attorney', 'termination_comfort'])
      or exists (
        select 1 from public.ip_details d
         where d.id = p_id
           and (f ->> 'embryos_tested' is null or d.embryos_tested = f ->> 'embryos_tested')
           and (coalesce((f ->> 'consulted_attorney')::boolean, false) = false or d.consulted_attorney)
           and (f ->> 'termination_comfort' is null or d.termination_comfort::text = f ->> 'termination_comfort'))
    else true
  end;
$$;
-- Only used inside the two functions below; nobody calls it directly.
revoke execute on function public.profile_matches_key_answers(uuid, public.user_role, jsonb) from public, anon, authenticated;

-- Browse: same as before, plus the key answers (and "open to twins" for intended parents).
create or replace function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  approx_lat double precision, approx_lng double precision,
  recently_active boolean, distance_miles double precision,
  profile_type text, agency_name text, agency_logo_path text,
  country text
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_anon boolean := auth.uid() is null or public.my_role() is null;
  v_limit integer := greatest(1, least(p_limit, 200));
  v_lat double precision := (p_filters ->> 'near_lat')::double precision;
  v_lng double precision := (p_filters ->> 'near_lng')::double precision;
  v_radius double precision := (p_filters ->> 'radius_miles')::double precision;
  v_by_distance boolean := coalesce(p_filters ->> 'sort', 'active') = 'distance';
  v_type text := p_filters ->> 'profile_type';   -- 'independent' | 'agency' | null (any)
  v_journey text;                                -- the viewer's own answer to "open to which journeys"
begin
  if not v_anon and (v_lat is null or v_lng is null) then
    select me.approx_lat, me.approx_lng into v_lat, v_lng from public.profiles me where me.id = auth.uid();
  end if;
  select me.journey_types into v_journey from public.profiles me where me.id = auth.uid();
  if v_lat is null or v_lng is null then v_by_distance := false; v_radius := null; end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.approx_lat, p.approx_lng,
         public.is_recently_active(p) as recently_active,
         public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) as distance_miles,
         p.profile_type, public.profile_agency_name(p), public.profile_agency_logo(p),
         p.country
    from public.profiles p
    left join public.surrogate_details sd on sd.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
   where public.profile_is_live(p)
     and (auth.uid() is null or p.id <> auth.uid() or p_filters ->> 'id' is not null)   -- never list yourself, except when your own page asks for you by id
     and (v_type is null or (v_type = 'agency' and p.profile_type = 'agency') or (v_type = 'independent' and p.profile_type <> 'agency'))
     and (v_journey is distinct from 'independent_only' or p.profile_type <> 'agency')   -- independent-only members never see agency profiles
     and (p_filters ->> 'id' is null or p.id::text = p_filters ->> 'id')
     and (p_filters ->> 'role' is null or p.role::text = p_filters ->> 'role')
     and (p_filters ->> 'state' is null or p.state = p_filters ->> 'state')
     and (coalesce((p_filters ->> 'us_only')::boolean, false) = false or p.country = 'US')   -- surrogates can hide parents living abroad
     and (coalesce((p_filters ->> 'verified_only')::boolean, false) = false or p.is_verified)
     and (v_radius is null or public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) <= v_radius)
     and (p_filters ->> 'open_to_twins' is null
          or (p.role = 'surrogate' and sd.open_to_twins::text = p_filters ->> 'open_to_twins')
          or (p.role = 'intended_parent' and ipd.open_to_twins::text = p_filters ->> 'open_to_twins'))
     and public.profile_matches_key_answers(p.id, p.role, p_filters)   -- migration 35: the key questionnaire answers
     and (p_filters ->> 'compensation_open' is null or p.role <> 'surrogate' or sd.compensation_open = (p_filters ->> 'compensation_open')::boolean)
     and (p_filters ->> 'willing_to_travel' is null or p.role <> 'surrogate' or sd.willing_to_travel::text = p_filters ->> 'willing_to_travel')
     and (p_filters ->> 'relationship_level' is null
          or (p.role = 'surrogate' and sd.relationship_level::text = p_filters ->> 'relationship_level')
          or (p.role = 'intended_parent' and ipd.relationship_level::text = p_filters ->> 'relationship_level'))
     and (p_filters ->> 'start_before' is null
          or (p.role = 'surrogate' and sd.earliest_start <= (p_filters ->> 'start_before')::date)
          or (p.role = 'intended_parent' and ipd.desired_start <= (p_filters ->> 'start_before')::date))
     and (p_filters ->> 'family_structure' is null or p.role <> 'intended_parent' or ipd.family_structure = p_filters ->> 'family_structure')
     and (p_filters ->> 'embryos_status' is null or p.role <> 'intended_parent' or ipd.embryos_status::text = p_filters ->> 'embryos_status')
   order by
     public.is_recently_active(p) desc,
     case when v_by_distance then public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) end asc nulls last,
     p.is_verified desc,
     p.last_active_at desc
   limit v_limit offset greatest(0, p_offset);
end $$;
grant execute on function public.browse_profiles(jsonb, integer, integer) to anon, authenticated;

-- Saved-search alerts use the same rules.
create or replace function public.profile_matches_filters(p public.profiles, f jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.profile_is_live(p)
     and (f ->> 'state' is null or p.state = f ->> 'state')
     and (coalesce((f ->> 'us_only')::boolean, false) = false or p.country = 'US')
     and (coalesce((f ->> 'verified_only')::boolean, false) = false or p.is_verified)
     and public.profile_matches_key_answers(p.id, p.role, f)
     and (p.role <> 'surrogate' or (
           (f ->> 'open_to_twins' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.open_to_twins::text = f ->> 'open_to_twins'))
       and (f ->> 'willing_to_travel' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.willing_to_travel::text = f ->> 'willing_to_travel'))
       and (f ->> 'compensation_open' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.compensation_open = (f ->> 'compensation_open')::boolean))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.relationship_level::text = f ->> 'relationship_level'))))
     and (p.role <> 'intended_parent' or (
           (f ->> 'family_structure' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.family_structure = f ->> 'family_structure'))
       and (f ->> 'open_to_twins' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.open_to_twins::text = f ->> 'open_to_twins'))
       and (f ->> 'embryos_status' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.embryos_status::text = f ->> 'embryos_status'))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.relationship_level::text = f ->> 'relationship_level'))));
$$;
