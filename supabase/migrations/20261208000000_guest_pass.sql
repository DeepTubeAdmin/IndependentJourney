-- Migration 31: guest pass. Visitors (not signed in) may read a few full
-- profiles before the join wall (Seth, 2026-11-18). Safe to run more than once.
--
-- How it works:
--   * The browser makes a random guest id and keeps it in local storage.
--   * guest_profile_view(guest, profile) records which profiles that guest
--     has opened. Up to guest_full_profiles distinct profiles (admin setting,
--     default 3; 0 turns the pass off) are returned in full; after that the
--     function says "used up" and the page shows the join wall.
--   * Re-opening a profile already on the pass never costs another view.
--   * The full view is exactly what a member's share link shows: story,
--     answers, parents, photos. Never private details or health answers.
-- Known limit: clearing browser storage starts a new pass. That is the
-- trade-off of a cookie-style meter; the setting can be lowered any time.

insert into public.app_settings (key, value, description) values
  ('guest_full_profiles', '3', 'Full profiles a visitor may read before joining (guest pass). 0 = off')
on conflict (key) do nothing;

create table if not exists public.guest_views (
  guest_id    uuid not null,
  profile_id  uuid not null,
  first_seen  timestamptz not null default now(),
  primary key (guest_id, profile_id)
);
alter table public.guest_views enable row level security;   -- no policies: only the function below touches it
revoke all on public.guest_views from anon, authenticated;

-- The full-profile document, shared by share links and the guest pass.
create or replace function public.profile_full_json(p public.profiles)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state, 'country', p.country,
    'is_verified', p.is_verified, 'bio', p.bio, 'headline_tags', p.headline_tags,
    'profile_type', p.profile_type, 'managed_by', p.managed_by,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'surrogate', (select to_jsonb(sd) - 'id' from public.surrogate_details sd where sd.id = p.id),
    'ip', (select to_jsonb(ipd) - 'id' from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(jsonb_build_object('first_name', ipp.first_name, 'age', ipp.age, 'position', ipp.position) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id)
  );
$$;
revoke all on function public.profile_full_json(public.profiles) from public, anon, authenticated;

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
  return public.profile_full_json(p);
end $$;

-- Visitor asks to read a profile in full. Returns
--   { allowed: true,  used: n, limit: m, profile: {...} }   or
--   { allowed: false, used: n, limit: m }                    (pass used up, or pass off)
-- Signed-in members get allowed:false; they use the normal member rules.
create or replace function public.guest_profile_view(p_guest uuid, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare p public.profiles; v_limit integer := public.setting_int('guest_full_profiles', 3); v_used integer;
begin
  select count(*) into v_used from public.guest_views where guest_id = p_guest;
  if auth.uid() is not null or v_limit <= 0 or p_guest is null then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', greatest(v_limit, 0));
  end if;
  select * into p from public.profiles where id = p_id;
  if p.id is null or not public.profile_is_live(p) then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit);
  end if;
  if not exists (select 1 from public.guest_views where guest_id = p_guest and profile_id = p_id) then
    if v_used >= v_limit then
      return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit);
    end if;
    insert into public.guest_views (guest_id, profile_id) values (p_guest, p_id) on conflict do nothing;
    v_used := v_used + 1;
  end if;
  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit, 'profile', public.profile_full_json(p));
end $$;
grant execute on function public.guest_profile_view(uuid, uuid) to anon, authenticated;

-- Housekeeping: passes older than 90 days. Run now and then from the SQL editor:
--   select public.prune_guest_views();
create or replace function public.prune_guest_views()
returns integer
language sql security definer set search_path = ''
as $$
  with gone as (delete from public.guest_views where first_seen < now() - interval '90 days' returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.prune_guest_views() from public, anon, authenticated;
