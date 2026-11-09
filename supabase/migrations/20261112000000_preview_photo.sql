-- =============================================================================
-- Migration 5: limited previews show the member's FIRST photo, unblurred.
-- (Seth's decision, 2026-11-09. Replaces the generated tiny "preview.jpg".)
-- Safe to run more than once.
-- =============================================================================

-- The first photo (lowest position) of a profile, or null.
create or replace function public.first_photo_path(p_profile uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select ph.storage_path from public.photos ph
   where ph.profile_id = p_profile
   order by ph.position, ph.id
   limit 1;
$$;

-- Browse and featured results now report the first photo as the preview photo.
drop function if exists public.browse_profiles(jsonb, integer, integer);
create function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.my_role();
  v_anon boolean := auth.uid() is null or v_role is null;
  v_limit integer := greatest(1, least(p_limit, 60));
begin
  if v_anon then
    v_limit := least(v_limit, 5);
    p_offset := 0;
  end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), p.created_at
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
   order by p.is_verified desc, p.created_at desc
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
   order by p.created_at desc
   limit greatest(1, least(p_limit, 12));
$$;

-- Storage: the first photo is readable by anyone allowed the preview.
drop policy if exists "Members read preview photos of previewable profiles" on storage.objects;
create policy "Members read preview photos of previewable profiles"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.can_preview(p)
        and name = public.first_photo_path(p.id)
    )
  );

drop policy if exists "Anyone reads preview photos of opted-in profiles" on storage.objects;
create policy "Anyone reads preview photos of opted-in profiles"
  on storage.objects for select to anon
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.profile_is_live(p) and p.visibility = 'public_previews'
        and name = public.first_photo_path(p.id)
    )
  );

-- The old generated preview column is no longer used.
alter table public.profiles drop column if exists preview_photo_path;
