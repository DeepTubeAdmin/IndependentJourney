-- Migration 30: intended parents may live outside the United States
-- (Seth, 2026-11-17). Safe to run more than once.
--
-- What changes:
--   * profiles.country (ISO code, default 'US'). Surrogates must stay 'US';
--     that is a separate, country-by-country legal decision for later.
--   * An intended parent outside the US has no state and no ZIP, so their
--     profile counts as complete without one, and cards show the country
--     where the state would be.
--   * Browse filter us_only: surrogates can hide parents living abroad. The
--     same key works in saved-search alerts.
--   * browse_profiles, featured_profiles, my_conversations and share_view
--     return the country as well (extra column at the end; existing callers
--     ignore it).

alter table public.profiles
  add column if not exists country text not null default 'US'
    check (country ~ '^[A-Z]{2}$');
comment on column public.profiles.country is 'ISO 3166-1 alpha-2 country code. Surrogates are always US; intended parents may live abroad.';

-- Surrogates stay US-only, and a parent abroad carries no US state.
create or replace function public.tg_check_country()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'surrogate' and new.country <> 'US' then
    raise exception 'Independent Journey lists surrogates in the United States only.' using errcode = 'check_violation';
  end if;
  if new.country <> 'US' then new.state := ''; end if;
  return new;
end $$;
drop trigger if exists profiles_country on public.profiles;
create trigger profiles_country
  before insert or update of country, role on public.profiles
  for each row execute function public.tg_check_country();

-- Completeness: parents abroad need no state.
create or replace function public.compute_profile_complete(p_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare v_role public.user_role; v_managed boolean; v_photos integer; v_ok boolean;
begin
  select role, managed_by is not null into v_role, v_managed from public.profiles where id = p_id;
  if v_role is null then return false; end if;
  select count(*) into v_photos from public.photos where profile_id = p_id;
  if v_photos < 3 then return false; end if;

  if v_role = 'surrogate' then
    select
      p.display_name <> '' and p.last_initial <> '' and p.state <> '' and p.bio <> ''
      and pp.date_of_birth is not null and pp.city <> '' and (v_managed or pp.phone <> '')
      and sd.willing_to_travel is not null and sd.us_resident is not null
      and sd.relationship_status <> '' and sd.has_health_insurance is not null
      and (sd.compensation_open or sd.compensation_min_usd is not null)
      and sd.open_to_twins is not null and sd.termination_comfort is not null
      and sd.relationship_level is not null and sd.carry_donor_embryos is not null
      and sd.earliest_start is not null
      and case when v_managed
            then sd.ob_cleared <> '' and sd.clinic_cleared <> ''
            else h.prior_births is not null and h.prior_pregnancies_uncomplicated is not null
                 and h.lifestyle_attestation is true and h.condition_affecting_pregnancy is not null
          end
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.surrogate_details sd on sd.id = p.id
    left join public.health_self_reports h on h.id = p.id
    where p.id = p_id;
  else
    select
      p.display_name <> '' and (p.state <> '' or p.country <> 'US') and p.bio <> ''   -- parents abroad have no US state
      and pp.city <> '' and (v_managed or pp.phone <> '')
      and ipd.family_structure <> '' and ipd.embryos_status is not null
      and ipd.open_to_twins is not null and ipd.desired_start is not null
      and ipd.relationship_level is not null and ipd.termination_comfort is not null
      and ipd.consulted_attorney is not null and ipd.budget_range <> ''
      and ipd.aware_of_birth_state_law is not null
      and exists (select 1 from public.ip_parents par where par.profile_id = p.id and par.first_name <> '' and par.age is not null)
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
    where p.id = p_id;
  end if;
  return coalesce(v_ok, false);
end $$;

-- Browse: country in the result, us_only filter.
drop function if exists public.browse_profiles(jsonb, integer, integer);
create function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
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
     and (p_filters ->> 'open_to_twins' is null or p.role <> 'surrogate' or sd.open_to_twins::text = p_filters ->> 'open_to_twins')
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

-- Homepage cards: country in the result.
drop function if exists public.featured_profiles(integer);
create function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  profile_type text, agency_name text, agency_logo_path text, country text
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.profile_type, public.profile_agency_name(p), public.profile_agency_logo(p), p.country
    from public.profiles p
   where public.profile_is_live(p)
     and (p.profile_type <> 'agency'
          or (select me.journey_types from public.profiles me where me.id = auth.uid()) is distinct from 'independent_only')
   order by public.is_recently_active(p) desc, p.is_verified desc, p.last_active_at desc
   limit greatest(1, least(p_limit, 12));
$$;

-- Inbox: the other member's country.
drop function if exists public.my_conversations();
create function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_name text, other_state text, other_role public.user_role,
  other_verified boolean, other_photo_path text, last_message_at timestamptz, last_preview text,
  unread integer, locked boolean, blocked boolean,
  mine_id uuid, mine_name text, other_profile_type text, other_agency_name text,
  other_country text
)
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select c.id as conversation_id,
           case when public.owns_or_manages(c.surrogate_id) then c.surrogate_id else c.ip_id end as me_id,
           case when public.owns_or_manages(c.surrogate_id) then c.ip_id else c.surrogate_id end as other_id,
           c.last_message_at
      from public.conversations c
     where public.owns_or_manages(c.surrogate_id) or public.owns_or_manages(c.ip_id)
  )
  select x.conversation_id, o.id, o.display_name, o.state, o.role, o.is_verified, public.first_photo_path(o.id), x.last_message_at,
         case when public.member_access(x.me_id) then (select left(m.body, 90) from public.messages m where m.conversation_id = x.conversation_id and not m.admin_hidden order by m.created_at desc limit 1) end,
         (select count(*)::integer from public.messages m where m.conversation_id = x.conversation_id and m.sender_id <> x.me_id and m.read_at is null and not m.admin_hidden),
         not public.member_access(x.me_id),
         public.is_blocked_between(x.me_id, o.id),
         x.me_id, me.display_name, o.profile_type, public.profile_agency_name(o),
         o.country
    from mine x
    join public.profiles o on o.id = x.other_id
    join public.profiles me on me.id = x.me_id
   order by x.last_message_at desc;
$$;

-- Share links: country in the view.
create or replace function public.share_view(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare p public.profiles;
begin
  select pr.* into p
    from public.share_links s join public.profiles pr on pr.id = s.profile_id
   where s.token = p_token and s.revoked_at is null;
  if p.id is null or not public.profile_is_live(p) or not p.is_verified then return null; end if;
  return jsonb_build_object(
    'id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state, 'country', p.country,
    'is_verified', p.is_verified, 'bio', p.bio, 'headline_tags', p.headline_tags,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'surrogate', (select to_jsonb(sd) - 'id' from public.surrogate_details sd where sd.id = p.id),
    'ip', (select to_jsonb(ipd) - 'id' from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(jsonb_build_object('first_name', ipp.first_name, 'age', ipp.age) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id)
  );
end $$;

-- Saved-search alerts honour us_only too.
create or replace function public.profile_matches_filters(p public.profiles, f jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.profile_is_live(p)
     and (f ->> 'state' is null or p.state = f ->> 'state')
     and (coalesce((f ->> 'us_only')::boolean, false) = false or p.country = 'US')
     and (coalesce((f ->> 'verified_only')::boolean, false) = false or p.is_verified)
     and (p.role <> 'surrogate' or (
           (f ->> 'open_to_twins' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.open_to_twins::text = f ->> 'open_to_twins'))
       and (f ->> 'willing_to_travel' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.willing_to_travel::text = f ->> 'willing_to_travel'))
       and (f ->> 'compensation_open' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.compensation_open = (f ->> 'compensation_open')::boolean))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.relationship_level::text = f ->> 'relationship_level'))))
     and (p.role <> 'intended_parent' or (
           (f ->> 'family_structure' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.family_structure = f ->> 'family_structure'))
       and (f ->> 'embryos_status' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.embryos_status::text = f ->> 'embryos_status'))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.relationship_level::text = f ->> 'relationship_level'))));
$$;

grant execute on function public.browse_profiles(jsonb, integer, integer) to anon, authenticated;
grant execute on function public.featured_profiles(integer) to anon, authenticated;
grant execute on function public.my_conversations() to authenticated;
