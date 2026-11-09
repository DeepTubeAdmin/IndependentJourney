-- =============================================================================
-- Migration 6: map view and "recently active first" ordering.
-- (Seth's request, 2026-11-09.) Safe to run more than once.
--
--   * Members enter a ZIP code (private). The app turns it into an
--     APPROXIMATE point (ZIP centre, rounded to ~0.7 miles) stored on the
--     profile, so others can see roughly where they are on a map. The exact
--     address is never collected.
--   * last_active_at is bumped (at most hourly) whenever a member opens the app.
--   * Browsing shows recently active members first. Anyone inactive longer
--     than the `inactive_after_days` setting (default 90) sinks to the bottom.
--   * Browsing can sort by distance from the viewer.
-- =============================================================================

alter table public.profile_private add column if not exists zip text not null default '';
alter table public.profile_private drop constraint if exists profile_private_zip_check;
alter table public.profile_private add constraint profile_private_zip_check check (zip = '' or zip ~ '^[0-9]{5}$');

alter table public.profiles add column if not exists approx_lat double precision;
alter table public.profiles add column if not exists approx_lng double precision;
alter table public.profiles add column if not exists last_active_at timestamptz not null default now();
create index if not exists profiles_last_active_idx on public.profiles (last_active_at desc);

insert into public.app_settings (key, value, description) values
  ('inactive_after_days', '90', 'Members who have not opened the app for this many days are listed after everyone else')
on conflict (key) do nothing;

-- Called by the app when a member opens it. Writes at most once an hour.
create or replace function public.touch_activity()
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles set last_active_at = now()
   where id = auth.uid() and last_active_at < now() - interval '1 hour';
$$;
grant execute on function public.touch_activity() to authenticated;

create or replace function public.inactive_after_days()
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_settings where key = 'inactive_after_days'), 90);
$$;

create or replace function public.is_recently_active(p public.profiles)
returns boolean
language sql stable
as $$
  select p.last_active_at >= now() - make_interval(days => public.inactive_after_days());
$$;

-- Great-circle distance in miles (haversine). Null if either point is missing.
create or replace function public.distance_miles(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 3958.8 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
  end;
$$;

-- -----------------------------------------------------------------------------
-- browse_profiles: now returns approximate location, activity and distance.
--   extra p_filters keys: sort ('active' default | 'distance'),
--   near_lat / near_lng (defaults to the viewer's own approximate location),
--   radius_miles (only with a location).
-- Members may fetch up to 200 rows (for the map); visitors still get 5.
-- -----------------------------------------------------------------------------
drop function if exists public.browse_profiles(jsonb, integer, integer);
create function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, created_at timestamptz,
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
  if v_anon then
    v_limit := least(v_limit, 5);
    p_offset := 0;
  elsif v_lat is null or v_lng is null then
    select me.approx_lat, me.approx_lng into v_lat, v_lng from public.profiles me where me.id = auth.uid();
  end if;
  if v_lat is null or v_lng is null then v_by_distance := false; v_radius := null; end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), p.created_at,
         p.approx_lat, p.approx_lng,
         public.is_recently_active(p) as recently_active,
         public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) as distance_miles
    from public.profiles p
    left join public.surrogate_details sd on sd.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
   where public.profile_is_live(p)
     and (not v_anon or p.visibility = 'public_previews')
     and (v_anon or p.role <> v_role)
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

drop function if exists public.featured_profiles(integer);
create function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), p.created_at
    from public.profiles p
   where public.profile_is_live(p) and p.is_verified and p.featured_opt_in and p.visibility = 'public_previews'
   order by public.is_recently_active(p) desc, p.last_active_at desc
   limit greatest(1, least(p_limit, 12));
$$;
