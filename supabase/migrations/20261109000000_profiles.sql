-- =============================================================================
-- Migration 2: accounts and profiles
--
-- One row in `profiles` per user (public, limited fields). Private contact
-- details live in `profile_private`. Role-specific answers live in
-- `surrogate_details` / `ip_details`. Health self-reports have their own
-- table with the strictest rules.
--
-- Access rules follow the table in MASTER_PROMPT.md section 4:
--   * Surrogates see only intended-parent profiles; IPs see only surrogate
--     profiles. Enforced here, in the database, not just in the app.
--   * A profile is visible to others only once it is complete.
--   * Full surrogate details need an active IP membership (Phase 7 adds the
--     memberships table; until then `has_active_membership()` returns false).
-- =============================================================================

create type public.user_role as enum ('surrogate', 'intended_parent');
create type public.visibility as enum ('members_only', 'public_previews');
create type public.yes_no_discuss as enum ('yes', 'no', 'discuss_later');
create type public.comfort_level as enum ('comfortable', 'not_comfortable', 'to_discuss');
create type public.relationship_level as enum ('minimal', 'regular_updates', 'close');

-- -----------------------------------------------------------------------------
-- profiles: the public, limited part of every account
-- -----------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null,
  display_name    text not null default '' check (char_length(display_name) <= 40),
  last_initial    text not null default '' check (char_length(last_initial) <= 1),
  state           text not null default '' check (state = '' or state ~ '^[A-Z]{2}$'),
  bio             text not null default '' check (char_length(bio) <= 1500),
  -- Short phrases shown on preview cards, e.g. "Open to twins".
  headline_tags   text[] not null default '{}',
  visibility      public.visibility not null default 'members_only',
  featured_opt_in boolean not null default false,
  is_complete     boolean not null default false,
  is_verified     boolean not null default false,
  verified_at     timestamptz,
  banned_at       timestamptz,
  suspended_until timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- profile_private: contact details and sensitive basics. Owner + admins only.
-- -----------------------------------------------------------------------------
create table public.profile_private (
  id                      uuid primary key references public.profiles (id) on delete cascade,
  first_name              text not null default '',
  last_name               text not null default '',
  date_of_birth           date,
  city                    text not null default '',
  phone                   text not null default '',
  phone_verified_at       timestamptz,
  -- Sign-up attestations
  attested_individual     boolean not null default false,   -- "I am an individual, not an agency"
  attested_age            boolean not null default false,   -- 21+ surrogate / 18+ IP
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- consents: which Terms / Privacy / disclaimer version each user agreed to.
-- -----------------------------------------------------------------------------
create table public.consents (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  document    text not null check (document in ('terms', 'privacy', 'disclaimer', 'message_review')),
  version     text not null,
  agreed_at   timestamptz not null default now(),
  ip_address  inet
);
create index consents_user_idx on public.consents (user_id);

-- -----------------------------------------------------------------------------
-- surrogate_details: journey preferences and situation (no health here)
-- -----------------------------------------------------------------------------
create table public.surrogate_details (
  id                        uuid primary key references public.profiles (id) on delete cascade,
  willing_to_travel         public.yes_no_discuss,
  us_resident               boolean,
  -- Situation
  relationship_status       text not null default '',          -- free choice, incl. "prefer not to say"
  partner_supportive        public.yes_no_discuss,
  has_health_insurance      public.yes_no_discuss,
  insurance_covers_surrogacy public.yes_no_discuss,
  support_system            text not null default '',
  reliable_transportation   boolean,
  financially_stable        public.yes_no_discuss,
  -- Preferences
  compensation_min_usd      integer check (compensation_min_usd is null or compensation_min_usd >= 0),
  compensation_max_usd      integer check (compensation_max_usd is null or compensation_max_usd >= 0),
  compensation_open         boolean not null default false,    -- "open to discuss"
  open_to_twins             public.comfort_level,
  termination_comfort       public.comfort_level,
  reduction_comfort         public.comfort_level,
  relationship_level        public.relationship_level,
  open_to_ip_types          text[] not null default '{}',      -- e.g. {'single_parent','same_sex_couple',...}
  carry_donor_embryos       public.yes_no_discuss,
  earliest_start            date,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- health_self_reports: yes/no + short answers ONLY. No medical records.
-- Shared with one IP at a time, only when the surrogate chooses (health_shares,
-- Phase 6). Flagged for attorney review: state consumer health data laws.
-- -----------------------------------------------------------------------------
create table public.health_self_reports (
  id                          uuid primary key references public.profiles (id) on delete cascade,
  prior_births                integer check (prior_births is null or prior_births between 0 and 20),
  prior_pregnancies_uncomplicated public.yes_no_discuss,
  pregnancy_notes             text not null default '' check (char_length(pregnancy_notes) <= 500),
  height_in                   integer check (height_in is null or height_in between 48 and 84),
  weight_lb                   integer check (weight_lb is null or weight_lb between 80 and 400),
  bmi_range                   text not null default '',   -- e.g. "under 30", "30-33", "prefer not to say"
  lifestyle_attestation       boolean,                    -- non-smoker, no drug use, no heavy alcohol
  vaccinated                  public.yes_no_discuss,
  condition_affecting_pregnancy public.yes_no_discuss,
  condition_notes             text not null default '' check (char_length(condition_notes) <= 500),
  updated_at                  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ip_details + ip_parents
-- -----------------------------------------------------------------------------
create table public.ip_details (
  id                        uuid primary key references public.profiles (id) on delete cascade,
  family_structure          text not null default '',          -- 'single', 'couple', 'prefer_not_to_say'
  reason_for_surrogacy      text not null default '',          -- multiple choice incl. prefer_not_to_say
  embryos_status            text not null default '',          -- 'created', 'in_progress', 'not_yet'
  genetic_material_source   text not null default '',          -- general only
  clinic_name               text not null default '',          -- or 'still choosing'
  embryo_count_range        text not null default '',
  children_hoped_for        text not null default '',
  open_to_twins             public.comfort_level,
  desired_start             date,
  -- Preferences
  surrogate_location_pref   text not null default '',
  relationship_level        public.relationship_level,
  termination_comfort       public.comfort_level,
  reduction_comfort         public.comfort_level,
  other_preferences         text not null default '' check (char_length(other_preferences) <= 800),
  -- Readiness
  consulted_attorney        boolean,
  budget_range              text not null default '',
  aware_of_birth_state_law  boolean,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table public.ip_parents (
  id            bigint generated always as identity primary key,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  position      smallint not null check (position in (1, 2)),
  first_name    text not null default '',
  age           integer check (age is null or age between 18 and 99),
  photo_path    text not null default '',
  unique (profile_id, position)
);

-- -----------------------------------------------------------------------------
-- photos: up to 6 per profile; 3 required for completeness.
-- `storage_path` points into the private `profile-photos` bucket.
-- -----------------------------------------------------------------------------
create table public.photos (
  id            bigint generated always as identity primary key,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  storage_path  text not null,
  position      smallint not null default 0,
  -- Perceptual hash for duplicate / stolen-photo detection (Phase 4).
  fingerprint   text,
  created_at    timestamptz not null default now(),
  unique (profile_id, position)
);

-- =============================================================================
-- Helper functions used by the policies
-- =============================================================================

create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.my_profile_complete()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select is_complete from public.profiles where id = auth.uid()), false); $$;

-- Phase 7 replaces this with a real lookup of the memberships table.
create or replace function public.has_active_membership(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$ select false; $$;

-- Can the signed-in user see this profile at all (as a limited preview)?
create or replace function public.can_preview(p_profile public.profiles)
returns boolean
language sql stable
as $$
  select
    p_profile.id = auth.uid()                      -- always see yourself
    or public.is_admin()
    or (
      p_profile.is_complete
      and p_profile.banned_at is null
      and public.my_role() is not null
      and p_profile.role <> public.my_role()       -- opposite role only
    );
$$;

-- Can the signed-in user see this profile's full details?
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
        -- A surrogate with a completed profile sees full IP profiles.
        (public.my_role() = 'surrogate' and public.my_profile_complete())
        -- An IP needs an active membership to see full surrogate profiles.
        or (public.my_role() = 'intended_parent' and public.has_active_membership())
      )
    );
$$;

-- =============================================================================
-- Row-level security
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.profile_private     enable row level security;
alter table public.consents            enable row level security;
alter table public.surrogate_details   enable row level security;
alter table public.health_self_reports enable row level security;
alter table public.ip_details          enable row level security;
alter table public.ip_parents          enable row level security;
alter table public.photos              enable row level security;

-- profiles
create policy "Read own profile or previewable profiles"
  on public.profiles for select to authenticated
  using (public.can_preview(profiles));
create policy "Insert own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "Update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Users cannot grant themselves verification or lift moderation.
    and is_verified = (select p.is_verified from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );
create policy "Admins read all profiles"
  on public.profiles for select to authenticated using (public.is_admin());

-- profile_private: owner and admins
create policy "Owner reads private" on public.profile_private for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Owner inserts private" on public.profile_private for insert to authenticated with check (id = auth.uid());
create policy "Owner updates private" on public.profile_private for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- consents: owner inserts/reads, admins read
create policy "Owner reads consents" on public.consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Owner records consent" on public.consents for insert to authenticated with check (user_id = auth.uid());

-- surrogate_details: owner, or anyone allowed the full profile
create policy "Read surrogate details" on public.surrogate_details for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = surrogate_details.id and public.can_view_full(p)));
create policy "Owner inserts surrogate details" on public.surrogate_details for insert to authenticated with check (id = auth.uid());
create policy "Owner updates surrogate details" on public.surrogate_details for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- health_self_reports: owner and admins only (Phase 6 adds per-conversation sharing)
create policy "Owner reads health" on public.health_self_reports for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Owner inserts health" on public.health_self_reports for insert to authenticated with check (id = auth.uid());
create policy "Owner updates health" on public.health_self_reports for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ip_details / ip_parents: owner, or anyone allowed the full profile
create policy "Read ip details" on public.ip_details for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = ip_details.id and public.can_view_full(p)));
create policy "Owner inserts ip details" on public.ip_details for insert to authenticated with check (id = auth.uid());
create policy "Owner updates ip details" on public.ip_details for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Read ip parents" on public.ip_parents for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = ip_parents.profile_id and public.can_preview(p)));
create policy "Owner manages ip parents" on public.ip_parents for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- photos: visible wherever the profile is previewable; owner manages
create policy "Read photos" on public.photos for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = photos.profile_id and public.can_preview(p)));
create policy "Owner manages photos" on public.photos for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- =============================================================================
-- Completeness: a profile becomes visible once 3 photos are uploaded and the
-- required questions are answered. Recomputed by trigger on every change.
-- =============================================================================
create or replace function public.compute_profile_complete(p_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_role public.user_role;
  v_ok boolean;
  v_photos integer;
begin
  select role into v_role from public.profiles where id = p_id;
  select count(*) into v_photos from public.photos where profile_id = p_id;
  if v_photos < 3 then return false; end if;

  if v_role = 'surrogate' then
    select
      p.display_name <> '' and p.last_initial <> '' and p.state <> '' and p.bio <> ''
      and pp.date_of_birth is not null and pp.city <> '' and pp.phone <> ''
      and sd.willing_to_travel is not null and sd.us_resident is not null
      and sd.relationship_status <> '' and sd.has_health_insurance is not null
      and (sd.compensation_open or sd.compensation_min_usd is not null)
      and sd.open_to_twins is not null and sd.termination_comfort is not null
      and sd.relationship_level is not null and sd.carry_donor_embryos is not null
      and sd.earliest_start is not null
      and h.prior_births is not null and h.prior_pregnancies_uncomplicated is not null
      and h.lifestyle_attestation is true and h.condition_affecting_pregnancy is not null
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.surrogate_details sd on sd.id = p.id
    left join public.health_self_reports h on h.id = p.id
    where p.id = p_id;
  else
    select
      p.display_name <> '' and p.state <> '' and p.bio <> ''
      and pp.city <> '' and pp.phone <> ''
      and d.family_structure <> '' and d.embryos_status <> '' and d.clinic_name <> ''
      and d.children_hoped_for <> '' and d.open_to_twins is not null and d.desired_start is not null
      and d.relationship_level is not null and d.termination_comfort is not null
      and d.consulted_attorney is not null and d.budget_range <> ''
      and d.aware_of_birth_state_law is not null
      and exists (select 1 from public.ip_parents ip where ip.profile_id = p.id and ip.first_name <> '' and ip.age is not null)
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.ip_details d on d.id = p.id
    where p.id = p_id;
  end if;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.refresh_profile_complete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- photos / ip_parents point at the profile via profile_id; every other
  -- table's primary key IS the profile id.
  v_id := coalesce(
    to_jsonb(new) ->> 'profile_id', to_jsonb(old) ->> 'profile_id',
    to_jsonb(new) ->> 'id',         to_jsonb(old) ->> 'id'
  )::uuid;
  update public.profiles
     set is_complete = public.compute_profile_complete(v_id),
         updated_at = now()
   where id = v_id
     and is_complete is distinct from public.compute_profile_complete(v_id);
  return null;
end;
$$;

create trigger profiles_complete after insert or update on public.profiles
  for each row execute function public.refresh_profile_complete();
create trigger profile_private_complete after insert or update on public.profile_private
  for each row execute function public.refresh_profile_complete();
create trigger surrogate_details_complete after insert or update on public.surrogate_details
  for each row execute function public.refresh_profile_complete();
create trigger health_complete after insert or update on public.health_self_reports
  for each row execute function public.refresh_profile_complete();
create trigger ip_details_complete after insert or update on public.ip_details
  for each row execute function public.refresh_profile_complete();
create trigger ip_parents_complete after insert or update or delete on public.ip_parents
  for each row execute function public.refresh_profile_complete();
create trigger photos_complete after insert or update or delete on public.photos
  for each row execute function public.refresh_profile_complete();

-- =============================================================================
-- New sign-ups: create the profile rows automatically from the role chosen at
-- sign-up (passed as user metadata `role`).
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'intended_parent');
  insert into public.profiles (id, role) values (new.id, v_role);
  insert into public.profile_private (id, attested_individual, attested_age)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'attested_individual')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'attested_age')::boolean, false)
  );
  -- Record which legal version they agreed to at sign-up.
  insert into public.consents (user_id, document, version)
  select new.id, d, coalesce(new.raw_user_meta_data ->> 'legal_version', 'unknown')
  from unnest(array['terms', 'privacy', 'disclaimer', 'message_review']) as d;
  if v_role = 'surrogate' then
    insert into public.surrogate_details (id) values (new.id);
    insert into public.health_self_reports (id) values (new.id);
  else
    insert into public.ip_details (id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Storage: private bucket for profile photos. Path convention:
--   <user id>/<file name>
-- Owners upload and manage their own folder. Reading other members' photos
-- goes through signed URLs issued by the app once the profile rules allow it
-- (Phase 5), so the bucket stays private.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Owners manage their photo folder"
  on storage.objects for all to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Members read previewable photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.can_preview(p)
    )
  );
