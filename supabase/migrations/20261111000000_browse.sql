-- =============================================================================
-- Migration 4: browsing, limited previews, interest, share links, memberships
--
-- Implements the access table from the master prompt for browsing:
--   anonymous   -> up to 5 limited previews of opted-in profiles (both sides)
--   surrogate   -> previews of intended parents; full IP profiles once complete
--   IP (free)   -> previews of surrogates only
--   IP (member) -> full surrogate profiles
-- A "limited preview" is: first name, state, blurred photo (surrogates),
-- headline tags and the Verified / Not verified label. Nothing else.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Preview photo: a tiny copy of the first photo, made by the app at upload
-- time (24px wide for surrogates so it can only ever look blurred, 600px for
-- intended parents). Stored at <user id>/preview.jpg in the private bucket.
-- -----------------------------------------------------------------------------
alter table public.profiles add column preview_photo_path text;

-- -----------------------------------------------------------------------------
-- Memberships. Phase 7 fills this from RevenueCat; until then admins can
-- grant a membership by hand (for testing and support), always logged.
-- -----------------------------------------------------------------------------
create table public.memberships (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  status              text not null check (status in ('active', 'lapsed', 'cancelled')),
  current_period_end  timestamptz not null,
  source              text not null default 'manual' check (source in ('manual', 'revenuecat')),
  external_id         text,
  updated_at          timestamptz not null default now()
);
alter table public.memberships enable row level security;
create policy "Members read their own membership"
  on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.has_active_membership(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user and m.status = 'active' and m.current_period_end > now()
  );
$$;

create or replace function public.admin_grant_membership(p_target uuid, p_months integer default 3, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  insert into public.memberships (user_id, status, current_period_end, source)
  values (p_target, 'active', now() + make_interval(months => greatest(1, p_months)), 'manual')
  on conflict (user_id) do update
    set status = 'active', current_period_end = excluded.current_period_end, source = 'manual', updated_at = now();
  perform public.admin_log('membership.grant', p_target, jsonb_build_object('months', p_months, 'reason', p_reason));
end $$;

create or replace function public.admin_end_membership(p_target uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.memberships set status = 'cancelled', updated_at = now() where user_id = p_target;
  if not found then raise exception 'No membership found'; end if;
  perform public.admin_log('membership.end', p_target, jsonb_build_object('reason', p_reason));
end $$;

-- -----------------------------------------------------------------------------
-- Suspended members are hidden too (the earlier version only hid banned ones).
-- -----------------------------------------------------------------------------
create or replace function public.profile_is_live(p public.profiles)
returns boolean
language sql immutable
as $$
  select p.is_complete and p.banned_at is null and (p.suspended_until is null or p.suspended_until < now());
$$;

create or replace function public.can_preview(p_profile public.profiles)
returns boolean
language sql stable
as $$
  select
    p_profile.id = auth.uid()
    or public.is_admin()
    or (
      public.profile_is_live(p_profile)
      and public.my_role() is not null
      and p_profile.role <> public.my_role()
    );
$$;

-- Seth's rule (2026-11-09): ANY surrogate account, even before her profile is
-- complete or verified, sees full intended-parent profiles. Completing the
-- profile is only required to message (Phase 6).
create or replace function public.can_view_full(p_profile public.profiles)
returns boolean
language sql stable
as $$
  select
    p_profile.id = auth.uid()
    or public.is_admin()
    or (
      public.can_preview(p_profile)
      and (
        public.my_role() = 'surrogate'
        or (public.my_role() = 'intended_parent' and public.has_active_membership())
      )
    );
$$;

-- -----------------------------------------------------------------------------
-- Browsing. One function serves the homepage, the browse page and the
-- profile preview page. It returns ONLY limited-preview fields.
--   p_filters keys (all optional):
--     id, role, state, verified_only,
--     surrogates: open_to_twins, compensation_open, relationship_level, willing_to_travel, start_before
--     intended parents: family_structure, embryos_status, relationship_level, start_before
-- -----------------------------------------------------------------------------
create or replace function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
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
    -- Anonymous visitors: opted-in profiles only, 5 at most, no paging.
    v_limit := least(v_limit, 5);
    p_offset := 0;
  end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, p.preview_photo_path, p.created_at
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
     -- surrogate filters (ignored for IP rows)
     and (p_filters ->> 'open_to_twins' is null or p.role <> 'surrogate' or sd.open_to_twins::text = p_filters ->> 'open_to_twins')
     and (p_filters ->> 'compensation_open' is null or p.role <> 'surrogate' or sd.compensation_open = (p_filters ->> 'compensation_open')::boolean)
     and (p_filters ->> 'willing_to_travel' is null or p.role <> 'surrogate' or sd.willing_to_travel::text = p_filters ->> 'willing_to_travel')
     and (p_filters ->> 'relationship_level' is null
          or (p.role = 'surrogate' and sd.relationship_level::text = p_filters ->> 'relationship_level')
          or (p.role = 'intended_parent' and ipd.relationship_level::text = p_filters ->> 'relationship_level'))
     and (p_filters ->> 'start_before' is null
          or (p.role = 'surrogate' and sd.earliest_start <= (p_filters ->> 'start_before')::date)
          or (p.role = 'intended_parent' and ipd.desired_start <= (p_filters ->> 'start_before')::date))
     -- intended parent filters (ignored for surrogate rows)
     and (p_filters ->> 'family_structure' is null or p.role <> 'intended_parent' or ipd.family_structure = p_filters ->> 'family_structure')
     and (p_filters ->> 'embryos_status' is null or p.role <> 'intended_parent' or ipd.embryos_status::text = p_filters ->> 'embryos_status')
   order by p.is_verified desc, p.created_at desc   -- verified profiles rank first
   limit v_limit offset greatest(0, p_offset);
end $$;

-- Homepage: verified members who opted in to being featured.
create or replace function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, p.preview_photo_path, p.created_at
    from public.profiles p
   where public.profile_is_live(p)
     and p.is_verified
     and p.featured_opt_in
     and p.visibility = 'public_previews'
   order by p.created_at desc
   limit greatest(1, least(p_limit, 12));
$$;

-- What the signed-in viewer is allowed to see of one profile. The app uses
-- this to decide between the preview page and the full page.
create or replace function public.my_access_to(p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = p_target;
  if p.id is null then return 'none'; end if;
  if public.can_view_full(p) then return 'full'; end if;
  if public.can_preview(p) then return 'preview'; end if;
  return 'none';
end $$;

-- -----------------------------------------------------------------------------
-- Photo access, corrected:
--   full photos      -> only people allowed the FULL profile (plus owner, admins)
--   preview.jpg      -> anyone allowed the preview; for anonymous visitors only
--                       when the owner opted in to public previews
--   share links      -> all photos of a profile with an active share link
-- -----------------------------------------------------------------------------
drop policy if exists "Members read previewable photos" on storage.objects;

create policy "Members read full photos when allowed the full profile"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1] and public.can_view_full(p)
    )
  );

create policy "Members read preview photos of previewable profiles"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and name = (storage.foldername(name))[1] || '/preview.jpg'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1] and public.can_preview(p)
    )
  );

create policy "Anyone reads preview photos of opted-in profiles"
  on storage.objects for select to anon
  using (
    bucket_id = 'profile-photos'
    and name = (storage.foldername(name))[1] || '/preview.jpg'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.profile_is_live(p) and p.visibility = 'public_previews'
    )
  );

-- -----------------------------------------------------------------------------
-- Interest: "I'm interested" from one member to another.
--   IPs need an active membership; surrogates need a complete profile.
-- -----------------------------------------------------------------------------
create table public.interests (
  id          bigint generated always as identity primary key,
  from_id     uuid not null references public.profiles (id) on delete cascade,
  to_id       uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz,
  unique (from_id, to_id),
  check (from_id <> to_id)
);
create index interests_to_idx on public.interests (to_id, created_at desc);
alter table public.interests enable row level security;

create policy "Express interest"
  on public.interests for insert to authenticated
  with check (
    from_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = to_id and public.can_preview(p))
    and (
      (public.my_role() = 'intended_parent' and public.has_active_membership())
      or (public.my_role() = 'surrogate' and public.my_profile_complete())
    )
  );
create policy "See interest sent or received"
  on public.interests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.is_admin());
create policy "Withdraw interest"
  on public.interests for delete to authenticated
  using (from_id = auth.uid());
create policy "Mark interest seen"
  on public.interests for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Share links: a verified, complete member can create one public link to
-- their profile. Unguessable token, revocable, and the page is noindex.
-- -----------------------------------------------------------------------------
create table public.share_links (
  token       text primary key default replace(gen_random_uuid()::text, '-', ''),  -- 32 random hex chars
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index share_links_profile_idx on public.share_links (profile_id);
alter table public.share_links enable row level security;
create policy "Owner sees their share links"
  on public.share_links for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "Owner revokes their share links"
  on public.share_links for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Returns the active link, creating one if needed. Only for verified, complete profiles.
create or replace function public.create_share_link()
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_token text; p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Not signed in'; end if;
  if not (p.is_verified and p.is_complete) then
    raise exception 'Share links are available once your profile is complete and verified' using errcode = '42501';
  end if;
  select token into v_token from public.share_links where profile_id = p.id and revoked_at is null limit 1;
  if v_token is null then
    insert into public.share_links (profile_id) values (p.id) returning token into v_token;
  end if;
  return v_token;
end $$;

-- Public share view. Anyone with the link sees the profile the way a full
-- member would, minus private details and health answers.
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
    'id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state,
    'is_verified', p.is_verified, 'bio', p.bio, 'headline_tags', p.headline_tags,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'surrogate', (select to_jsonb(sd) - 'id' from public.surrogate_details sd where sd.id = p.id),
    'ip', (select to_jsonb(ipd) - 'id' from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(jsonb_build_object('first_name', ipp.first_name, 'age', ipp.age) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id)
  );
end $$;

create policy "Anyone reads photos of shared profiles"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.share_links s join public.profiles p on p.id = s.profile_id
      where s.profile_id::text = (storage.foldername(name))[1]
        and s.revoked_at is null and p.is_verified and public.profile_is_live(p)
    )
  );
