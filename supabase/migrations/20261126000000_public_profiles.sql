-- =============================================================================
-- Migration 19: every live profile is shown publicly as a limited preview.
--
-- Seth's decision (2026-11-11): no more "members only / public previews"
-- choice and no more homepage opt-in. Visitors see limited previews (first
-- name, state, photos, headline tags, verified label) of every complete,
-- non-banned, non-suspended profile, on the homepage and the browse page,
-- without the old five-profile cap. Full profiles are still members-only
-- exactly as before. The visibility and featured_opt_in columns stay in the
-- table (nothing writes them any more) so older app builds keep working.
-- Safe to run more than once.
-- =============================================================================

-- Visitors and members alike: previews of every live profile.
drop function if exists public.browse_profiles(jsonb, integer, integer);
create function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  approx_lat double precision, approx_lng double precision,
  recently_active boolean, distance_miles double precision
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_anon boolean := auth.uid() is null or v_role is null;
  v_limit integer := greatest(1, least(p_limit, 200));
  v_lat double precision := (p_filters ->> 'near_lat')::double precision;
  v_lng double precision := (p_filters ->> 'near_lng')::double precision;
  v_radius double precision := (p_filters ->> 'radius_miles')::double precision;
  v_by_distance boolean := coalesce(p_filters ->> 'sort', 'active') = 'distance';
begin
  if not v_anon and (v_lat is null or v_lng is null) then
    select me.approx_lat, me.approx_lng into v_lat, v_lng from public.profiles me where me.id = auth.uid();
  end if;
  if v_lat is null or v_lng is null then v_by_distance := false; v_radius := null; end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.approx_lat, p.approx_lng,
         public.is_recently_active(p) as recently_active,
         public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) as distance_miles
    from public.profiles p
    left join public.surrogate_details sd on sd.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
   where public.profile_is_live(p)
     and (v_anon or p.role <> v_role)                                     -- members see the other side only
     and (p_filters ->> 'id' is null or p.id::text = p_filters ->> 'id')
     and (p_filters ->> 'role' is null or p.role::text = p_filters ->> 'role')
     and (p_filters ->> 'state' is null or p.state = p_filters ->> 'state')
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
     public.is_recently_active(p) desc,                                   -- active members first, inactive last
     case when v_by_distance then public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) end asc nulls last,
     p.is_verified desc,                                                  -- then verified
     p.last_active_at desc                                                -- then most recently active
   limit v_limit offset greatest(0, p_offset);
end $$;

-- Homepage cards: every live profile, verified and recently active first.
drop function if exists public.featured_profiles(integer);
create function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at
    from public.profiles p
   where public.profile_is_live(p)
   order by public.is_recently_active(p) desc, p.is_verified desc, p.last_active_at desc
   limit greatest(1, least(p_limit, 12));
$$;

-- Photos: visitors may see the photos of any live profile.
create or replace function public.photo_is_previewable(p_object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(p_object_name))[1]
      and (
        (auth.uid() is not null and public.can_preview(p))
        or (auth.uid() is null and public.profile_is_live(p))
      )
  );
$$;
revoke execute on function public.photo_is_previewable(text) from public;
grant execute on function public.photo_is_previewable(text) to anon, authenticated;

grant execute on function public.browse_profiles(jsonb, integer, integer) to anon, authenticated;
grant execute on function public.featured_profiles(integer) to anon, authenticated;
