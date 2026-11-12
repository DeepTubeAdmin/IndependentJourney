-- =============================================================================
-- Migration 23: Agency accounts.
--
-- Seth's decision (2026-11-12): a third account type. An agency signs up as a
-- business, Seth approves it in the admin dashboard, and the agency then
-- posts and manages profiles for the surrogates and intended parents it
-- represents, answering the same questionnaires. Every profile is labelled
-- Independent, "With an agency" (an independent member who also works with
-- one) or Agency. Members choose whether agencies may message them.
--
-- How it fits the existing design:
--   * An agency user has NO row in profiles. It has a row in the new
--     agencies table (same id as the login). my_role() stays null for it, so
--     every "opposite role" rule keeps working.
--   * Agency-posted profiles are ordinary profiles rows whose id is a fresh
--     uuid (not a login) and whose managed_by points at the agency. Every
--     "is this my profile" rule becomes owns_or_manages(id).
--   * Agency pricing: free during beta (setting agency_pricing_mode = 'free').
--     The columns and checks for a paid plan are in place for later.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Settings
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('agency_pricing_mode', '"free"', 'How agencies pay: "free" (beta), "subscription" (monthly), "per_profile", or "both"'),
  ('agency_subscription_price_usd', '199', 'Agency subscription price per month, in US dollars (used when pricing is on)'),
  ('agency_profile_price_usd', '199', 'Agency price per posted profile, in US dollars (used when pricing is per_profile or both)')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Agencies
-- -----------------------------------------------------------------------------
create table if not exists public.agencies (
  id                      uuid primary key references auth.users (id) on delete cascade,
  name                    text not null default '' check (char_length(name) <= 80),
  website                 text not null default '' check (char_length(website) <= 200),
  logo_path               text not null default '',          -- object in the agency-logos bucket
  contact_name            text not null default '' check (char_length(contact_name) <= 80),
  contact_phone           text not null default '' check (char_length(contact_phone) <= 30),
  year_founded            integer check (year_founded is null or year_founded between 1950 and 2100),
  hq_state                text not null default '' check (hq_state = '' or hq_state ~ '^[A-Z]{2}$'),
  states_served           text[] not null default '{}',      -- two-letter codes, or {'ALL'}
  services                text[] not null default '{}',
  ip_fee_range            text not null default '',          -- typical agency fee for intended parents
  journey_cost_range      text not null default '',          -- typical all-in journey cost estimate
  surrogate_comp_range    text not null default '',          -- typical surrogate base compensation
  match_wait              text not null default '',
  journeys_range          text not null default '',          -- journeys completed, as a range
  international           text not null default '',          -- yes / no
  lgbtq                   text not null default '',          -- yes / no
  works_with_site_matches text not null default '',          -- will they work with a pair who met here?
  escrow                  text not null default '',
  surrogate_screening     text[] not null default '{}',
  memberships             text[] not null default '{}',
  description             text not null default '' check (char_length(description) <= 1500),
  attested_consent        boolean not null default false,    -- has written consent from every client it lists
  is_complete             boolean not null default false,    -- details filled in (recomputed by trigger)
  status                  text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  review_note             text not null default '',
  reviewed_at             timestamptz,
  reviewed_by             uuid references auth.users (id),
  paid_until              timestamptz,                       -- for the paid plan later; ignored while pricing is free
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table public.agencies enable row level security;

-- Logos: a small public bucket. Agencies manage their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-logos', 'agency-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;
drop policy if exists "Agencies manage their logo folder" on storage.objects;
create policy "Agencies manage their logo folder"
  on storage.objects for all to authenticated
  using (bucket_id = 'agency-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'agency-logos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Anyone reads agency logos" on storage.objects;
create policy "Anyone reads agency logos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'agency-logos');

-- -----------------------------------------------------------------------------
-- 3. Profiles: ownership, labels, messaging preference, medical clearance
-- -----------------------------------------------------------------------------
-- A managed profile is not a login, so profiles.id can no longer reference
-- auth.users. A trigger below keeps deletions in step instead.
alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists managed_by uuid references public.agencies (id) on delete cascade,
  add column if not exists profile_type text not null default 'independent'
    check (profile_type in ('independent', 'with_agency', 'agency')),
  add column if not exists agency_name text not null default '' check (char_length(agency_name) <= 80),
  add column if not exists agency_messages boolean not null default true;   -- may agencies message this member?
create index if not exists profiles_managed_by_idx on public.profiles (managed_by);

comment on column public.profiles.profile_type is 'independent = on their own; with_agency = independent member who also works with an agency (agency_name); agency = posted and managed by an agency account (managed_by).';
comment on column public.profiles.agency_messages is 'When false, agency-posted profiles cannot start a conversation with this member.';

-- Medical clearance, answered by the agency instead of the private health step.
alter table public.surrogate_details
  add column if not exists ob_cleared text not null default '' check (ob_cleared in ('', 'yes', 'no', 'in_progress')),
  add column if not exists clinic_cleared text not null default '' check (clinic_cleared in ('', 'yes', 'no', 'in_progress')),
  add column if not exists clearance_clinic text not null default '' check (char_length(clearance_clinic) <= 120);

-- Who sent a message on behalf of a profile (an agency login), for the label.
alter table public.messages add column if not exists sent_by uuid references auth.users (id) on delete set null;

-- Emails can now go to an agency login, which has no profile row.
alter table public.email_outbox drop constraint if exists email_outbox_user_id_fkey;
alter table public.email_outbox add constraint email_outbox_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 4. Helper functions
-- -----------------------------------------------------------------------------
-- Is the signed-in user an approved agency?
create or replace function public.is_agency()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.agencies a where a.id = auth.uid() and a.status = 'approved'); $$;

-- May this agency use the site (approved, and paid up when pricing is on)?
create or replace function public.agency_access(p_agency uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.agencies a
     where a.id = p_agency and a.status = 'approved'
       and (coalesce((select value #>> '{}' from public.app_settings where key = 'agency_pricing_mode'), 'free') = 'free'
            or (a.paid_until is not null and a.paid_until > now()))
  );
$$;

-- Does the signed-in agency manage this profile?
create or replace function public.manages(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = p_profile and p.managed_by is not null and p.managed_by = auth.uid()); $$;

create or replace function public.owns_or_manages(p_profile uuid)
returns boolean
language sql stable
as $$ select p_profile = auth.uid() or public.manages(p_profile); $$;

-- Storage folders are text; only compare when it looks like a uuid.
create or replace function public.manages_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_folder ~ '^[0-9a-f-]{36}$'
     and exists (select 1 from public.profiles p where p.id::text = p_folder and p.managed_by is not null and p.managed_by = auth.uid());
$$;

-- Can this profile's side read incoming messages and start conversations?
-- Agency-posted: the agency's access. Surrogates: always. Intended parents: membership.
create or replace function public.member_access(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = p_profile
      and case
        when p.managed_by is not null then public.agency_access(p.managed_by)
        when p.role = 'surrogate' then true
        else public.has_active_membership(p.id)
      end
  );
$$;

-- Name and logo of the agency behind a profile (either kind of agency link).
create or replace function public.profile_agency_name(p public.profiles)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p.managed_by is not null then (select a.name from public.agencies a where a.id = p.managed_by)
    when p.profile_type = 'with_agency' then nullif(p.agency_name, '')
    else null end;
$$;

create or replace function public.profile_agency_logo(p public.profiles)
returns text
language sql stable security definer set search_path = ''
as $$ select case when p.managed_by is not null then nullif((select a.logo_path from public.agencies a where a.id = p.managed_by), '') end; $$;

-- Visibility rules now include agencies and managed profiles.
create or replace function public.can_preview(p_profile public.profiles)
returns boolean
language sql stable
as $$
  select
    p_profile.id = auth.uid()
    or public.is_admin()
    or public.manages(p_profile.id)
    or (
      public.profile_is_live(p_profile)
      and (
        (public.my_role() is not null and p_profile.role <> public.my_role())
        or public.is_agency()
      )
    );
$$;

create or replace function public.can_view_full(p_profile public.profiles)
returns boolean
language sql stable
as $$
  select
    p_profile.id = auth.uid()
    or public.is_admin()
    or public.manages(p_profile.id)
    or (
      public.can_preview(p_profile)
      and (
        public.my_role() = 'surrogate'
        or (public.my_role() = 'intended_parent' and public.has_active_membership())
        or public.agency_access()
      )
    );
$$;

-- -----------------------------------------------------------------------------
-- 5. Row-level security: owner OR managing agency
-- -----------------------------------------------------------------------------
-- agencies: owner and admins. Status and review columns only change through
-- admin functions; the owner's update may not touch them.
drop policy if exists "Agency reads itself" on public.agencies;
create policy "Agency reads itself" on public.agencies for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "Agency updates itself" on public.agencies;
create policy "Agency updates itself" on public.agencies for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and status = (select a.status from public.agencies a where a.id = auth.uid())
    and paid_until is not distinct from (select a.paid_until from public.agencies a where a.id = auth.uid())
  );

-- profiles
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile"
  on public.profiles for update to authenticated
  using (public.owns_or_manages(id))
  with check (
    public.owns_or_manages(id)
    -- Nobody grants themselves verification, changes role, or moves a profile between owners.
    and is_verified = (select p.is_verified from public.profiles p where p.id = profiles.id)
    and role = (select p.role from public.profiles p where p.id = profiles.id)
    and managed_by is not distinct from (select p.managed_by from public.profiles p where p.id = profiles.id)
    and profile_type = case when managed_by is null then profile_type else 'agency' end
  );

drop policy if exists "Owner reads private" on public.profile_private;
create policy "Owner reads private" on public.profile_private for select to authenticated using (public.owns_or_manages(id) or public.is_admin());
drop policy if exists "Owner inserts private" on public.profile_private;
create policy "Owner inserts private" on public.profile_private for insert to authenticated with check (public.owns_or_manages(id));
drop policy if exists "Owner updates private" on public.profile_private;
create policy "Owner updates private" on public.profile_private for update to authenticated using (public.owns_or_manages(id)) with check (public.owns_or_manages(id));

drop policy if exists "Owner inserts surrogate details" on public.surrogate_details;
create policy "Owner inserts surrogate details" on public.surrogate_details for insert to authenticated with check (public.owns_or_manages(id));
drop policy if exists "Owner updates surrogate details" on public.surrogate_details;
create policy "Owner updates surrogate details" on public.surrogate_details for update to authenticated using (public.owns_or_manages(id)) with check (public.owns_or_manages(id));

drop policy if exists "Owner inserts ip details" on public.ip_details;
create policy "Owner inserts ip details" on public.ip_details for insert to authenticated with check (public.owns_or_manages(id));
drop policy if exists "Owner updates ip details" on public.ip_details;
create policy "Owner updates ip details" on public.ip_details for update to authenticated using (public.owns_or_manages(id)) with check (public.owns_or_manages(id));

drop policy if exists "Owner manages ip parents" on public.ip_parents;
create policy "Owner manages ip parents" on public.ip_parents for all to authenticated
  using (public.owns_or_manages(profile_id)) with check (public.owns_or_manages(profile_id));

drop policy if exists "Owner manages photos" on public.photos;
create policy "Owner manages photos" on public.photos for all to authenticated
  using (public.owns_or_manages(profile_id)) with check (public.owns_or_manages(profile_id));

-- Health self-reports stay owner-only on purpose: an agency never enters or
-- reads a client's health answers. (No change to those policies.)

-- Photo files: the managing agency may upload into a client's folder.
drop policy if exists "Owners manage their photo folder" on storage.objects;
create policy "Owners manage their photo folder"
  on storage.objects for all to authenticated
  using (bucket_id = 'profile-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.manages_folder((storage.foldername(name))[1])))
  with check (bucket_id = 'profile-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.manages_folder((storage.foldername(name))[1])));

-- Blocks are per profile; an agency blocks on behalf of a client profile.
drop policy if exists "Own blocks" on public.blocks;
create policy "Own blocks" on public.blocks for all to authenticated
  using (public.owns_or_manages(blocker_id)) with check (public.owns_or_manages(blocker_id));

-- Conversations and messages: participants, or the agency behind a participant.
drop policy if exists "Participants see conversations" on public.conversations;
create policy "Participants see conversations" on public.conversations for select to authenticated
  using (public.owns_or_manages(surrogate_id) or public.owns_or_manages(ip_id) or public.is_admin());

create or replace function public.can_read_incoming(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.member_access(p_user); $$;

drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages" on public.messages for select to authenticated
  using (
    not admin_hidden
    and exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and (public.owns_or_manages(c.surrogate_id) or public.owns_or_manages(c.ip_id))
         -- Incoming messages are readable only when the receiving side has access.
         and (public.owns_or_manages(messages.sender_id)
              or public.member_access(case when public.owns_or_manages(c.surrogate_id) then c.surrogate_id else c.ip_id end))
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Completeness
-- -----------------------------------------------------------------------------
-- Agency-posted profiles: no phone, no private health step; instead the
-- agency answers the medical-clearance questions. Everything else matches.
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
      p.display_name <> '' and p.state <> '' and p.bio <> ''
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

-- Agency details complete: enough for Seth to review and for clients to be listed.
create or replace function public.tg_agency_complete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.is_complete := new.name <> '' and new.website <> '' and new.contact_name <> '' and new.hq_state <> ''
    and cardinality(new.states_served) > 0 and cardinality(new.services) > 0 and new.ip_fee_range <> ''
    and new.description <> '' and new.attested_consent;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists agencies_complete on public.agencies;
create trigger agencies_complete before insert or update on public.agencies for each row execute function public.tg_agency_complete();

-- -----------------------------------------------------------------------------
-- 7. Sign-up, creating and removing profiles, deletion
-- -----------------------------------------------------------------------------
-- Email sign-up with role=agency in the metadata creates the agency row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'role' in ('surrogate', 'intended_parent') then
    perform public.create_profile_rows(
      new.id,
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      coalesce((new.raw_user_meta_data ->> 'attested_individual')::boolean, false),
      coalesce((new.raw_user_meta_data ->> 'attested_age')::boolean, false),
      new.raw_user_meta_data ->> 'legal_version');
  elsif new.raw_user_meta_data ->> 'role' = 'agency' then
    insert into public.agencies (id, name, website, contact_name)
    values (new.id, left(coalesce(new.raw_user_meta_data ->> 'agency_name', ''), 80),
            left(coalesce(new.raw_user_meta_data ->> 'agency_website', ''), 200),
            left(coalesce(new.raw_user_meta_data ->> 'contact_name', ''), 80))
    on conflict (id) do nothing;
    insert into public.consents (user_id, document, version)
    select new.id, d, coalesce(new.raw_user_meta_data ->> 'legal_version', 'unknown')
    from unnest(array['terms', 'privacy', 'disclaimer', 'message_review']) as d
    on conflict do nothing;
  end if;
  return new;
end $$;

-- Social sign-up as an agency (Google / Apple), called once by the app.
create or replace function public.complete_agency_signup(p_name text, p_website text, p_contact_name text, p_legal_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = v_id) or exists (select 1 from public.agencies where id = v_id) then
    raise exception 'This account is already set up.' using errcode = '23505';
  end if;
  insert into public.agencies (id, name, website, contact_name) values (v_id, left(coalesce(p_name, ''), 80), left(coalesce(p_website, ''), 200), left(coalesce(p_contact_name, ''), 80));
  insert into public.consents (user_id, document, version)
  select v_id, d, coalesce(p_legal_version, 'unknown') from unnest(array['terms', 'privacy', 'disclaimer', 'message_review']) as d;
end $$;
revoke execute on function public.complete_agency_signup(text, text, text, text) from public, anon;
grant execute on function public.complete_agency_signup(text, text, text, text) to authenticated;

-- consents.user_id pointed at profiles; agencies record consent too.
alter table public.consents drop constraint if exists consents_user_id_fkey;
alter table public.consents add constraint consents_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
drop policy if exists "Owner reads consents" on public.consents;
create policy "Owner reads consents" on public.consents for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- The agency adds a client. Returns the new profile id; the app then walks
-- the normal questionnaire for it.
create or replace function public.agency_create_profile(p_role public.user_role)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_agency public.agencies; v_id uuid := gen_random_uuid();
begin
  select * into v_agency from public.agencies where id = auth.uid();
  if v_agency.id is null then raise exception 'agency_only' using errcode = '42501'; end if;
  if v_agency.status <> 'approved' then raise exception 'agency_not_approved' using errcode = '42501'; end if;
  if not v_agency.is_complete then raise exception 'agency_details_incomplete' using errcode = '42501'; end if;
  if not public.agency_access(v_agency.id) then raise exception 'agency_payment_required' using errcode = '42501'; end if;

  insert into public.profiles (id, role, managed_by, profile_type) values (v_id, p_role, v_agency.id, 'agency');
  insert into public.profile_private (id, attested_individual, attested_age) values (v_id, false, true);
  if p_role = 'surrogate' then
    insert into public.surrogate_details (id) values (v_id);
    insert into public.health_self_reports (id) values (v_id);   -- stays empty; never shown
  else
    insert into public.ip_details (id) values (v_id);
  end if;
  return v_id;
end $$;
revoke execute on function public.agency_create_profile(public.user_role) from public, anon;
grant execute on function public.agency_create_profile(public.user_role) to authenticated;

-- Removes one profile and everything that hangs off it. Messages keep a plain
-- reference to their sender, so they go first.
create or replace function public.purge_profile(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.messages where sender_id = p_id
     or conversation_id in (select id from public.conversations where surrogate_id = p_id or ip_id = p_id);
  delete from public.conversations where surrogate_id = p_id or ip_id = p_id or started_by = p_id;
  begin
    delete from storage.objects where bucket_id = 'profile-photos' and name like p_id::text || '/%';
  exception when others then null;
  end;
  delete from public.profiles where id = p_id;
end $$;
revoke execute on function public.purge_profile(uuid) from public, anon, authenticated;

-- The agency removes a client profile (the app deletes the photo files first).
create or replace function public.agency_delete_profile(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.manages(p_id) then raise exception 'not_your_profile' using errcode = '42501'; end if;
  perform public.purge_profile(p_id);
end $$;
revoke execute on function public.agency_delete_profile(uuid) from public, anon;
grant execute on function public.agency_delete_profile(uuid) to authenticated;

-- A member or agency deletes their own account.
create or replace function public.delete_my_account(p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := auth.uid(); v_role public.user_role; v_joined timestamptz; r record;
begin
  if v_id is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_roles where user_id = v_id) then
    raise exception 'Admin accounts cannot be deleted from Settings. Ask another admin to remove your admin role first.' using errcode = '42501';
  end if;
  select role, created_at into v_role, v_joined from public.profiles where id = v_id;
  if v_role is not null then
    insert into public.deleted_accounts (role, joined_at, reason) values (v_role, v_joined, left(coalesce(p_reason, ''), 500));
  end if;
  for r in select id from public.profiles where managed_by = v_id loop perform public.purge_profile(r.id); end loop;
  if v_role is not null then perform public.purge_profile(v_id); end if;
  begin
    delete from storage.objects where bucket_id = 'agency-logos' and name like v_id::text || '/%';
  exception when others then null;
  end;
  delete from public.agencies where id = v_id;
  delete from auth.users where id = v_id;
end $$;

-- If a login is removed any other way (Supabase dashboard), tidy up the same way.
create or replace function public.handle_deleted_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  for r in select id from public.profiles where managed_by = old.id loop perform public.purge_profile(r.id); end loop;
  if exists (select 1 from public.profiles where id = old.id) then perform public.purge_profile(old.id); end if;
  return old;
end $$;
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted before delete on auth.users for each row execute function public.handle_deleted_user();

-- Activity: an agency opening the app keeps all its client profiles "active".
create or replace function public.touch_activity()
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles set last_active_at = now()
   where (id = auth.uid() or managed_by = auth.uid()) and last_active_at < now() - interval '1 hour';
$$;

-- -----------------------------------------------------------------------------
-- 8. Browsing: labels and the Independent / Agency filter
-- -----------------------------------------------------------------------------
drop function if exists public.browse_profiles(jsonb, integer, integer);
create function public.browse_profiles(p_filters jsonb default '{}'::jsonb, p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  approx_lat double precision, approx_lng double precision,
  recently_active boolean, distance_miles double precision,
  profile_type text, agency_name text, agency_logo_path text
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
  v_type text := p_filters ->> 'profile_type';   -- 'independent' | 'agency' | null (any)
begin
  if not v_anon and (v_lat is null or v_lng is null) then
    select me.approx_lat, me.approx_lng into v_lat, v_lng from public.profiles me where me.id = auth.uid();
  end if;
  if v_lat is null or v_lng is null then v_by_distance := false; v_radius := null; end if;

  return query
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.approx_lat, p.approx_lng,
         public.is_recently_active(p) as recently_active,
         public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) as distance_miles,
         p.profile_type, public.profile_agency_name(p), public.profile_agency_logo(p)
    from public.profiles p
    left join public.surrogate_details sd on sd.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
   where public.profile_is_live(p)
     and (v_anon or p.role <> v_role)                                     -- members see the other side only
     and (v_type is null or (v_type = 'agency' and p.profile_type = 'agency') or (v_type = 'independent' and p.profile_type <> 'agency'))
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
     public.is_recently_active(p) desc,
     case when v_by_distance then public.distance_miles(v_lat, v_lng, p.approx_lat, p.approx_lng) end asc nulls last,
     p.is_verified desc,
     p.last_active_at desc
   limit v_limit offset greatest(0, p_offset);
end $$;

drop function if exists public.featured_profiles(integer);
create function public.featured_profiles(p_limit integer default 6)
returns table (
  id uuid, role public.user_role, display_name text, state text, is_verified boolean,
  headline_tags text[], preview_photo_path text, photo_paths text[], created_at timestamptz,
  profile_type text, agency_name text, agency_logo_path text
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.role, p.display_name, p.state, p.is_verified, p.headline_tags, public.first_photo_path(p.id), public.preview_photo_paths(p.id), p.created_at,
         p.profile_type, public.profile_agency_name(p), public.profile_agency_logo(p)
    from public.profiles p
   where public.profile_is_live(p)
   order by public.is_recently_active(p) desc, p.is_verified desc, p.last_active_at desc
   limit greatest(1, least(p_limit, 12));
$$;

-- Public card for an agency (shown on its clients' profiles). No contact details.
create or replace function public.agency_card(p_agency uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id', a.id, 'name', a.name, 'website', a.website, 'logo_path', a.logo_path,
                            'hq_state', a.hq_state, 'states_served', a.states_served, 'services', a.services,
                            'year_founded', a.year_founded, 'ip_fee_range', a.ip_fee_range, 'journey_cost_range', a.journey_cost_range,
                            'surrogate_comp_range', a.surrogate_comp_range, 'match_wait', a.match_wait, 'journeys_range', a.journeys_range,
                            'international', a.international, 'lgbtq', a.lgbtq, 'works_with_site_matches', a.works_with_site_matches,
                            'escrow', a.escrow, 'surrogate_screening', a.surrogate_screening, 'memberships', a.memberships,
                            'description', a.description)
    from public.agencies a where a.id = p_agency and a.status = 'approved';
$$;
grant execute on function public.agency_card(uuid) to anon, authenticated;

-- The signed-in agency's own row plus its client profiles, for the dashboard.
create or replace function public.my_agency()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select to_jsonb(a) || jsonb_build_object(
           'has_access', public.agency_access(a.id),
           'pricing_mode', coalesce((select value #>> '{}' from public.app_settings where key = 'agency_pricing_mode'), 'free'),
           'profiles', coalesce((
             select jsonb_agg(jsonb_build_object('id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state,
                                                 'is_complete', p.is_complete, 'is_verified', p.is_verified, 'created_at', p.created_at,
                                                 'photo_path', public.first_photo_path(p.id),
                                                 'unread', (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id
                                                             where (c.surrogate_id = p.id or c.ip_id = p.id) and m.sender_id <> p.id and m.read_at is null and not m.admin_hidden))
                              order by p.created_at desc)
               from public.profiles p where p.managed_by = a.id), '[]'::jsonb))
    from public.agencies a where a.id = auth.uid();
$$;
revoke execute on function public.my_agency() from public, anon;
grant execute on function public.my_agency() to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Messaging on behalf of a client
-- -----------------------------------------------------------------------------
-- Can profile p_from (mine, or managed by me) message p_target?
create or replace function public.can_message_as(p_from uuid, p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare me public.profiles; them public.profiles;
begin
  if auth.uid() is null then return 'sign_in'; end if;
  if not public.owns_or_manages(p_from) then return 'not_available'; end if;
  select * into me from public.profiles where id = p_from;
  select * into them from public.profiles where id = p_target;
  if me.id is null or them.id is null or me.id = them.id then return 'not_available'; end if;
  if me.role = them.role then return 'same_role'; end if;
  if not public.profile_is_live(them) then return 'not_available'; end if;
  if me.banned_at is not null or (me.suspended_until is not null and me.suspended_until > now()) then return 'account_restricted'; end if;
  if public.is_blocked_between(me.id, them.id) then return 'blocked'; end if;
  if me.managed_by is not null then
    if not me.is_complete then return 'profile_incomplete'; end if;
    if not public.agency_access(me.managed_by) then return 'agency_access_required'; end if;
    -- A member who chose "independent messages only" cannot be approached by an agency.
    if them.managed_by is null and not them.agency_messages
       and not exists (select 1 from public.conversations c where (c.surrogate_id = me.id and c.ip_id = them.id) or (c.ip_id = me.id and c.surrogate_id = them.id)) then
      return 'agency_messages_off';
    end if;
    return 'ok';
  end if;
  if me.role = 'surrogate' and not me.is_complete then return 'profile_incomplete'; end if;
  if me.role = 'intended_parent' and not public.has_active_membership(me.id) then return 'membership_required'; end if;
  return 'ok';
end $$;
revoke execute on function public.can_message_as(uuid, uuid) from public, anon;
grant execute on function public.can_message_as(uuid, uuid) to authenticated;

create or replace function public.can_message(p_target uuid)
returns text
language sql stable security definer set search_path = ''
as $$ select case when auth.uid() is null then 'sign_in' else public.can_message_as(auth.uid(), p_target) end; $$;

create or replace function public.send_message_as(p_from uuid, p_to uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := public.can_message_as(p_from, p_to);
  me public.profiles;
  v_conv public.conversations;
  v_surrogate uuid; v_ip uuid;
  v_is_new boolean := false;
  v_limit integer; v_today integer;
  v_count integer; v_flags text[]; v_msg_id bigint;
  v_locked boolean;
begin
  if v_reason <> 'ok' then raise exception '%', v_reason using errcode = '42501'; end if;
  if p_body is null or char_length(btrim(p_body)) = 0 then raise exception 'empty_message' using errcode = '22023'; end if;
  if char_length(p_body) > 4000 then raise exception 'message_too_long' using errcode = '22023'; end if;

  select * into me from public.profiles where id = p_from;
  if me.role = 'surrogate' then v_surrogate := me.id; v_ip := p_to; else v_surrogate := p_to; v_ip := me.id; end if;

  v_limit := public.setting_int(case when me.is_verified then 'messages_per_day_verified' else 'messages_per_day_unverified' end, 60);
  select count(*) into v_today from public.messages where sender_id = me.id and created_at > now() - interval '1 day';
  if v_today >= v_limit then raise exception 'daily_message_limit' using errcode = '42501'; end if;

  select * into v_conv from public.conversations where surrogate_id = v_surrogate and ip_id = v_ip;
  if v_conv.id is null then
    v_is_new := true;
    v_limit := public.setting_int(
      case
        when me.role = 'surrogate' and me.is_verified then 'surrogate_new_conversations_per_day_verified'
        when me.role = 'surrogate' then 'surrogate_new_conversations_per_day_unverified'
        when me.is_verified then 'ip_new_conversations_per_day_verified'
        else 'ip_new_conversations_per_day_unverified'
      end, 3);
    select count(*) into v_today from public.conversations where started_by = me.id and created_at > now() - interval '1 day';
    if v_today >= v_limit then raise exception 'daily_conversation_limit' using errcode = '42501'; end if;
    insert into public.conversations (surrogate_id, ip_id, started_by) values (v_surrogate, v_ip, me.id) returning * into v_conv;
  end if;

  select count(*) into v_count from public.messages where conversation_id = v_conv.id;
  v_flags := public.scan_message(p_body, v_count);

  insert into public.messages (conversation_id, sender_id, sent_by, body, scam_flags)
  values (v_conv.id, me.id, auth.uid(), p_body, v_flags) returning id into v_msg_id;
  update public.conversations set last_message_at = now() where id = v_conv.id;

  if 'money_request' = any (v_flags) and not exists (
      select 1 from public.member_flags f where f.profile_id = me.id and f.kind = 'fraud_suspected' and f.cleared_at is null and f.note like 'Scam pattern in message%') then
    insert into public.member_flags (profile_id, kind, note) values (me.id, 'fraud_suspected', 'Scam pattern in message #' || v_msg_id || ' (money request)');
  end if;

  v_locked := not public.member_access(p_to);
  return jsonb_build_object('conversation_id', v_conv.id, 'message_id', v_msg_id,
                            'status', case when v_locked then 'locked' else 'delivered' end,
                            'flags', to_jsonb(v_flags), 'new_conversation', v_is_new);
end $$;
revoke execute on function public.send_message_as(uuid, uuid, text) from public, anon;
grant execute on function public.send_message_as(uuid, uuid, text) to authenticated;

create or replace function public.send_message(p_to uuid, p_body text)
returns jsonb
language sql security definer set search_path = ''
as $$ select public.send_message_as(auth.uid(), p_to, p_body); $$;

-- Inbox: one row per conversation across every profile the viewer owns or manages.
drop function if exists public.my_conversations();
create function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_name text, other_state text, other_role public.user_role,
  other_verified boolean, other_photo_path text, last_message_at timestamptz, last_preview text,
  unread integer, locked boolean, blocked boolean,
  mine_id uuid, mine_name text, other_profile_type text, other_agency_name text
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
         x.me_id, me.display_name, o.profile_type, public.profile_agency_name(o)
    from mine x
    join public.profiles o on o.id = x.other_id
    join public.profiles me on me.id = x.me_id
   order by x.last_message_at desc;
$$;
grant execute on function public.my_conversations() to authenticated;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.messages m set read_at = now()
    from public.conversations c
   where c.id = p_conversation and m.conversation_id = c.id and m.read_at is null
     and (public.owns_or_manages(c.surrogate_id) or public.owns_or_manages(c.ip_id))
     and not public.owns_or_manages(m.sender_id)
     and public.member_access(case when public.owns_or_manages(c.surrogate_id) then c.surrogate_id else c.ip_id end);
$$;

create or replace function public.my_unread_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where (public.owns_or_manages(c.surrogate_id) or public.owns_or_manages(c.ip_id))
     and not public.owns_or_manages(m.sender_id) and m.read_at is null and not m.admin_hidden;
$$;

-- -----------------------------------------------------------------------------
-- 10. Emails
-- -----------------------------------------------------------------------------
-- Agency-posted profiles have no login: the agency gets the email, and the
-- subject names the client. Welcome and beta-membership triggers skip them.
create or replace function public.tg_email_welcome() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.managed_by is null then
    perform public.enqueue_email(new.id, 'welcome', jsonb_build_object('role', new.role), 'welcome:' || new.id);
  end if;
  return new;
end $$;

create or replace function public.tg_beta_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_months integer := public.setting_int('beta_free_membership_months', 0);
begin
  if new.role = 'intended_parent' and new.managed_by is null and v_months > 0 then
    insert into public.memberships (user_id, status, current_period_end, source)
    values (new.id, 'active', now() + make_interval(months => v_months), 'manual')
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.tg_email_new_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations; v_to public.profiles; v_sender public.profiles; v_locked boolean;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select * into v_to from public.profiles where id = case when new.sender_id = c.surrogate_id then c.ip_id else c.surrogate_id end;
  select * into v_sender from public.profiles where id = new.sender_id;
  v_locked := not public.member_access(v_to.id);
  perform public.enqueue_email(
    coalesce(v_to.managed_by, v_to.id),
    case when v_locked then 'locked_message' else 'new_message' end,
    jsonb_build_object('conversation_id', c.id, 'sender_name', v_sender.display_name, 'sender_state', v_sender.state,
                       'sender_verified', v_sender.is_verified,
                       'sender_agency', public.profile_agency_name(v_sender),
                       'for_name', case when v_to.managed_by is not null then v_to.display_name end,
                       'preview', case when v_locked then null else left(new.body, 140) end),
    'msg:' || c.id || ':' || to_char(now(), 'YYYY-MM-DD-HH24'));
  return new;
end $$;

-- Recipients may be agency logins with no profile row.
create or replace function public.claim_emails(p_limit integer default 50)
returns table (id bigint, user_id uuid, email text, display_name text, template text, payload jsonb, attempts integer)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  with picked as (
    select e.id from public.email_outbox e
     where e.status = 'queued' order by e.id limit greatest(1, least(p_limit, 200)) for update skip locked
  ), upd as (
    update public.email_outbox e set status = 'sending', attempts = e.attempts + 1
      from picked where e.id = picked.id
    returning e.id, e.user_id, e.template, e.payload, e.attempts
  )
  select u.id, u.user_id, au.email::text, coalesce(p.display_name, a.contact_name, ''), u.template, u.payload, u.attempts
    from upd u
    join auth.users au on au.id = u.user_id
    left join public.profiles p on p.id = u.user_id
    left join public.agencies a on a.id = u.user_id;
end $$;

-- Tell every admin when an agency signs up, and again when its details are
-- complete and ready to review. Tell the agency when it is approved or not.
create or replace function public.tg_agency_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_email(new.id, 'agency_welcome', jsonb_build_object('agency_name', new.name), 'agency_welcome:' || new.id);
    for r in select user_id from public.admin_roles loop
      perform public.enqueue_email(r.user_id, 'agency_pending', jsonb_build_object('agency_id', new.id, 'agency_name', new.name, 'website', new.website, 'contact_name', new.contact_name), 'agency_pending:' || new.id || ':' || r.user_id);
    end loop;
  elsif new.is_complete and not old.is_complete and new.status = 'pending' then
    for r in select user_id from public.admin_roles loop
      perform public.enqueue_email(r.user_id, 'agency_ready', jsonb_build_object('agency_id', new.id, 'agency_name', new.name, 'website', new.website, 'contact_name', new.contact_name), 'agency_ready:' || new.id || ':' || r.user_id);
    end loop;
  elsif new.status <> old.status and new.status in ('approved', 'rejected', 'suspended') then
    perform public.enqueue_email(new.id, 'agency_' || new.status, jsonb_build_object('agency_name', new.name, 'note', new.review_note), 'agency_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
drop trigger if exists agency_emails on public.agencies;
create trigger agency_emails after insert or update on public.agencies for each row execute function public.tg_agency_emails();

-- -----------------------------------------------------------------------------
-- 11. Admin
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_agencies(p_status text default null)
returns table (id uuid, name text, website text, contact_name text, email text, status text, is_complete boolean, hq_state text, created_at timestamptz, profile_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select a.id, a.name, a.website, a.contact_name, u.email::text, a.status, a.is_complete, a.hq_state, a.created_at,
         (select count(*) from public.profiles p where p.managed_by = a.id)
    from public.agencies a join auth.users u on u.id = a.id
   where p_status is null or a.status = p_status
   order by case a.status when 'pending' then 0 else 1 end, a.created_at desc;
end $$;
revoke execute on function public.admin_list_agencies(text) from public, anon;
grant execute on function public.admin_list_agencies(text) to authenticated;

create or replace function public.admin_agency_detail(p_agency uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select to_jsonb(a) || jsonb_build_object(
           'email', (select u.email::text from auth.users u where u.id = a.id),
           'profiles', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state, 'is_complete', p.is_complete, 'created_at', p.created_at) order by p.created_at desc)
                                   from public.profiles p where p.managed_by = a.id), '[]'::jsonb))
    into v from public.agencies a where a.id = p_agency;
  if v is null then raise exception 'Agency not found'; end if;
  perform public.admin_log('agency_viewed', p_agency);
  return v;
end $$;
revoke execute on function public.admin_agency_detail(uuid) from public, anon;
grant execute on function public.admin_agency_detail(uuid) to authenticated;

-- Approve, reject or suspend. Suspending hides every client profile too.
create or replace function public.admin_set_agency_status(p_agency uuid, p_status text, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_status not in ('pending', 'approved', 'rejected', 'suspended') then raise exception 'Unknown status'; end if;
  update public.agencies set status = p_status, review_note = left(coalesce(p_note, ''), 500), reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_agency;
  if p_status = 'suspended' then
    update public.profiles set suspended_until = now() + interval '100 years' where managed_by = p_agency;
  elsif p_status = 'approved' then
    update public.profiles set suspended_until = null where managed_by = p_agency and suspended_until > now() + interval '50 years';
  end if;
  perform public.admin_log('agency_status', p_agency, jsonb_build_object('status', p_status, 'note', p_note));
end $$;
revoke execute on function public.admin_set_agency_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_agency_status(uuid, text, text) to authenticated;

-- Members list: managed profiles have no login; show the agency's email instead.
create or replace function public.admin_search_members(p_query text default '', p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, last_initial text, state text,
  email text, is_complete boolean, is_verified boolean, banned_at timestamptz, suspended_until timestamptz,
  created_at timestamptz, open_flags bigint, open_reports bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, p.role, p.display_name, p.last_initial, p.state,
         coalesce(u.email::text, '(agency) ' || coalesce(au.email::text, '')), p.is_complete, p.is_verified, p.banned_at, p.suspended_until, p.created_at,
         (select count(*) from public.member_flags f where f.profile_id = p.id and f.cleared_at is null),
         (select count(*) from public.reports r where r.reported_id = p.id and r.status in ('open', 'reviewing'))
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join auth.users au on au.id = p.managed_by
   where p_query = ''
      or p.display_name ilike '%' || p_query || '%'
      or u.email ilike '%' || p_query || '%'
      or au.email ilike '%' || p_query || '%'
      or p.state ilike p_query
      or p.id::text = p_query
   order by p.created_at desc
   limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'members_total', (select count(*) from public.profiles),
    'surrogates', (select count(*) from public.profiles where role = 'surrogate'),
    'intended_parents', (select count(*) from public.profiles where role = 'intended_parent'),
    'complete', (select count(*) from public.profiles where is_complete),
    'verified', (select count(*) from public.profiles where is_verified),
    'open_reports', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'open_flags', (select count(*) from public.member_flags where cleared_at is null),
    'new_this_week', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'messages_this_week', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'flagged_messages_open', (select count(*) from public.messages where cardinality(scam_flags) > 0 and created_at > now() - interval '30 days'),
    'active_memberships', (select count(*) from public.memberships where status = 'active' and current_period_end > now()),
    'revenue_this_month_cents', (select coalesce(sum(amount_cents), 0) from public.payment_events
                                   where type = 'checkout.session.completed' and created_at >= date_trunc('month', now())),
    'agencies_pending', (select count(*) from public.agencies where status = 'pending'),
    'agencies_approved', (select count(*) from public.agencies where status = 'approved'),
    'agency_profiles', (select count(*) from public.profiles where managed_by is not null)
  );
end $$;
