-- =============================================================================
-- Migration 38: everything is free, surrogate age is shown, and two new
-- Browse filters.
--
-- 1. Free access. A new setting, free_access (on), gives every intended
--    parent who has joined the same access a paid membership used to give:
--    full surrogate profiles and messaging. Who can see what is otherwise
--    unchanged (visitors still get limited previews and the guest pass, and
--    everyone still needs a complete profile to send messages). No "your
--    membership is ending" emails go out while it is on. Turning the setting
--    off in Admin, Settings brings back the old membership rules.
-- 2. A surrogate's age (whole years, never the date of birth) is shown as the
--    first highlight on her card and profile, worked out fresh each time so
--    it is always current.
-- 3. Browse filters for surrogates: age range, and first-time or experienced.
-- Safe to run more than once.
-- =============================================================================

-- 1. Free access --------------------------------------------------------------
insert into public.app_settings (key, value, description)
values ('free_access', 'true', 'Everything is free: every intended parent who has joined gets full profiles and messaging without a membership (true/false)')
on conflict (key) do nothing;

create or replace function public.free_access()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::boolean from public.app_settings s where s.key = 'free_access'), false);
$$;

create or replace function public.has_active_membership(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (public.free_access() and exists (select 1 from public.profiles p where p.id = p_user))
      or exists (
        select 1 from public.memberships m
        where m.user_id = p_user and m.status = 'active' and m.current_period_end > now()
      );
$$;

create or replace function public.my_membership()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'status', coalesce((select case when m.status = 'active' and m.current_period_end <= now() then 'lapsed' else m.status end
                          from public.memberships m where m.user_id = auth.uid()), 'none'),
    'active', public.has_active_membership(auth.uid()),
    'current_period_end', (select m.current_period_end from public.memberships m where m.user_id = auth.uid()),
    'source', (select m.source from public.memberships m where m.user_id = auth.uid()),
    'free', public.free_access(),
    'price_usd', public.setting_int('membership_price_usd', 199),
    'term_months', public.setting_int('membership_term_months', 3)
  );
$$;

create or replace function public.enqueue_membership_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; m record;
begin
  -- While everything is free nobody's access ends, so there is nothing to remind about.
  if public.free_access() then return 0; end if;
  for m in select * from public.memberships
            where status = 'active' and current_period_end between now() + interval '6 days' and now() + interval '8 days' loop
    perform public.enqueue_email(m.user_id, 'membership_ending',
      jsonb_build_object('period_end', m.current_period_end, 'price_usd', public.setting_int('membership_price_usd', 199)),
      'ending:' || m.user_id || ':' || m.current_period_end::date);
    n := n + 1;
  end loop;
  for m in select * from public.memberships
            where status = 'active' and current_period_end between now() - interval '2 days' and now() loop
    perform public.enqueue_email(m.user_id, 'membership_ended',
      jsonb_build_object('period_end', m.current_period_end), 'ended:' || m.user_id || ':' || m.current_period_end::date);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 2. Surrogate age --------------------------------------------------------------
create or replace function public.surrogate_age(p_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select extract(year from age(current_date, pp.date_of_birth))::integer
    from public.profiles p join public.profile_private pp on pp.id = p.id
   where p.id = p_id and p.role = 'surrogate' and pp.date_of_birth is not null;
$$;
revoke execute on function public.surrogate_age(uuid) from public, anon, authenticated;

-- The highlights shown on a card: for surrogates, "Age 29" comes first.
create or replace function public.profile_card_tags(p public.profiles)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select case when public.surrogate_age(p.id) is null then p.headline_tags
              else array_prepend('Age ' || public.surrogate_age(p.id), p.headline_tags) end;
$$;
revoke execute on function public.profile_card_tags(public.profiles) from public, anon, authenticated;

-- 3. Filters ----------------------------------------------------------------------
create or replace function public.profile_matches_key_answers(p_id uuid, p_role public.user_role, f jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_role = 'surrogate' then
      not (f ?| array['experienced', 'termination_comfort', 'untested_embryos_ok', 'carry_donor_embryos', 'international_ips_ok', 'comp_max', 'open_to_ip_type', 'experience', 'age_min', 'age_max'])
      or exists (
        select 1 from public.surrogate_details sd
         where sd.id = p_id
           and (coalesce((f ->> 'experienced')::boolean, false) = false or coalesce(sd.journeys_completed, 0) >= 1)
           -- migration 38: first-time or experienced, and age in whole years
           and (f ->> 'experience' is null
                or (f ->> 'experience' = 'experienced' and coalesce(sd.journeys_completed, 0) >= 1)
                or (f ->> 'experience' = 'first_time' and coalesce(sd.journeys_completed, 0) = 0))
           and (f ->> 'age_min' is null or public.surrogate_age(p_id) >= (f ->> 'age_min')::integer)
           and (f ->> 'age_max' is null or public.surrogate_age(p_id) <= (f ->> 'age_max')::integer)
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

-- The lists and the full profile now carry the age highlight.
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
  select p.id, p.role, p.display_name, p.state, p.is_verified, public.profile_card_tags(p), public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
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

create or replace function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  profile_type text, agency_name text, agency_logo_path text, country text
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, public.profile_card_tags(p), public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.profile_type, public.profile_agency_name(p), public.profile_agency_logo(p), p.country
    from public.profiles p
   where public.profile_is_live(p)
     and (p.profile_type <> 'agency'
          or (select me.journey_types from public.profiles me where me.id = auth.uid()) is distinct from 'independent_only')
   order by public.is_recently_active(p) desc, p.is_verified desc, p.last_active_at desc
   limit greatest(1, least(p_limit, 12));
$$;

create or replace function public.profile_full_json(p public.profiles)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state, 'country', p.country,
    'is_verified', p.is_verified, 'bio', p.bio, 'headline_tags', public.profile_card_tags(p),
    'age', public.surrogate_age(p.id), 'profile_type', p.profile_type, 'managed_by', p.managed_by,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'surrogate', (select to_jsonb(sd) - 'id' from public.surrogate_details sd where sd.id = p.id),
    'ip', (select to_jsonb(ipd) - 'id' from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(jsonb_build_object('first_name', ipp.first_name, 'age', ipp.age, 'position', ipp.position) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id)
  );
$$;
