-- =============================================================================
-- Migration 3: admin tools
--
-- Adds member reports, safety flags, an audit log, and the functions admins
-- use to act on members. Every admin action goes through a function that
-- (1) checks the caller is an admin who has passed two-factor authentication
-- and (2) writes an audit-log row. There is no way to act without a log entry.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lets a signed-in user find out whether they are on the admin list, even
-- before two-factor authentication. Only reveals the caller's own status.
-- -----------------------------------------------------------------------------
create or replace function public.am_i_admin_candidate()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Reports: a member reports another member.
-- -----------------------------------------------------------------------------
create type public.report_reason as enum (
  'scam_or_money', 'agency_or_recruiter', 'harassment', 'fake_profile', 'inappropriate_content', 'other'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id               bigint generated always as identity primary key,
  reporter_id      uuid not null references auth.users (id) on delete cascade,
  reported_id      uuid not null references public.profiles (id) on delete cascade,
  reason           public.report_reason not null,
  details          text not null default '' check (char_length(details) <= 2000),
  status           public.report_status not null default 'open',
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      uuid references auth.users (id),
  resolution_note  text not null default '',
  check (reporter_id <> reported_id)
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_id);

alter table public.reports enable row level security;

create policy "Members file reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "Members read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
-- Admins change reports only through admin_resolve_report() (audited).

-- -----------------------------------------------------------------------------
-- Flags: internal safety markers on a member. Some are added automatically
-- (see the bio trigger below), the rest by admins. Never shown to members.
-- -----------------------------------------------------------------------------
create type public.flag_kind as enum (
  'agency_suspected', 'fraud_suspected', 'contact_info_in_profile', 'duplicate_photos', 'other'
);

create table public.member_flags (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  kind        public.flag_kind not null,
  note        text not null default '',
  created_by  uuid references auth.users (id),      -- null = added automatically
  created_at  timestamptz not null default now(),
  cleared_at  timestamptz,
  cleared_by  uuid references auth.users (id)
);
create index member_flags_open_idx on public.member_flags (profile_id) where cleared_at is null;

alter table public.member_flags enable row level security;
create policy "Admins read flags"
  on public.member_flags for select to authenticated using (public.is_admin());
-- Changes only through admin functions.

-- -----------------------------------------------------------------------------
-- Audit log: one row per admin action. Append only.
-- -----------------------------------------------------------------------------
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid not null references auth.users (id),
  action      text not null,
  target_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_id);

alter table public.admin_audit_log enable row level security;
create policy "Admins read the audit log"
  on public.admin_audit_log for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Internal helpers used by every admin function.
-- -----------------------------------------------------------------------------
create or replace function public.assert_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access with two-factor authentication required'
      using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_log(p_action text, p_target uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.admin_audit_log (admin_id, action, target_id, details)
  values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- -----------------------------------------------------------------------------
-- Admin actions. Each one: check admin, do the change, log it.
-- -----------------------------------------------------------------------------

-- Suspend (until a date), unsuspend, ban, or unban a member.
create or replace function public.admin_set_member_status(
  p_target uuid, p_action text, p_reason text default '', p_until timestamptz default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_action = 'suspend' then
    update public.profiles set suspended_until = coalesce(p_until, now() + interval '7 days') where id = p_target;
  elsif p_action = 'unsuspend' then
    update public.profiles set suspended_until = null where id = p_target;
  elsif p_action = 'ban' then
    update public.profiles set banned_at = now() where id = p_target;
  elsif p_action = 'unban' then
    update public.profiles set banned_at = null where id = p_target;
  else
    raise exception 'Unknown action %', p_action;
  end if;
  if not found then raise exception 'Member not found'; end if;
  perform public.admin_log('member.' || p_action, p_target,
    jsonb_build_object('reason', coalesce(p_reason, ''), 'until', p_until));
end $$;

-- Mark a member Verified or Not verified by hand (used until an ID
-- verification provider is connected, and for corrections afterwards).
create or replace function public.admin_set_verified(p_target uuid, p_verified boolean, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.profiles
     set is_verified = p_verified,
         verified_at = case when p_verified then now() else null end
   where id = p_target;
  if not found then raise exception 'Member not found'; end if;
  perform public.admin_log(case when p_verified then 'member.verify' else 'member.unverify' end,
    p_target, jsonb_build_object('reason', coalesce(p_reason, '')));
end $$;

-- Add or clear a safety flag.
create or replace function public.admin_add_flag(p_target uuid, p_kind public.flag_kind, p_note text default '')
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_id bigint;
begin
  perform public.assert_admin();
  insert into public.member_flags (profile_id, kind, note, created_by)
  values (p_target, p_kind, coalesce(p_note, ''), auth.uid()) returning id into v_id;
  perform public.admin_log('flag.add', p_target, jsonb_build_object('flag_id', v_id, 'kind', p_kind, 'note', p_note));
  return v_id;
end $$;

create or replace function public.admin_clear_flag(p_flag_id bigint, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_target uuid;
begin
  perform public.assert_admin();
  update public.member_flags set cleared_at = now(), cleared_by = auth.uid()
   where id = p_flag_id and cleared_at is null returning profile_id into v_target;
  if not found then raise exception 'Flag not found or already cleared'; end if;
  perform public.admin_log('flag.clear', v_target, jsonb_build_object('flag_id', p_flag_id, 'note', p_note));
end $$;

-- Move a report to reviewing / resolved / dismissed.
create or replace function public.admin_resolve_report(p_report_id bigint, p_status public.report_status, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_target uuid;
begin
  perform public.assert_admin();
  update public.reports
     set status = p_status,
         resolution_note = coalesce(p_note, ''),
         resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end,
         resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() else null end
   where id = p_report_id returning reported_id into v_target;
  if not found then raise exception 'Report not found'; end if;
  perform public.admin_log('report.' || p_status::text, v_target, jsonb_build_object('report_id', p_report_id, 'note', p_note));
end $$;

-- Change an app setting (price, term, limits). Logged like everything else.
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.app_settings set value = p_value, updated_at = now(), updated_by = auth.uid() where key = p_key;
  if not found then raise exception 'Unknown setting %', p_key; end if;
  perform public.admin_log('setting.update', null, jsonb_build_object('key', p_key, 'value', p_value));
end $$;

-- -----------------------------------------------------------------------------
-- Admin read helpers. These return private data, so they check is_admin().
-- -----------------------------------------------------------------------------

-- Search members by name, email, or state. Returns a compact row per member.
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
         u.email, p.is_complete, p.is_verified, p.banned_at, p.suspended_until, p.created_at,
         (select count(*) from public.member_flags f where f.profile_id = p.id and f.cleared_at is null),
         (select count(*) from public.reports r where r.reported_id = p.id and r.status in ('open', 'reviewing'))
    from public.profiles p
    join auth.users u on u.id = p.id
   where p_query = ''
      or p.display_name ilike '%' || p_query || '%'
      or u.email ilike '%' || p_query || '%'
      or p.state ilike p_query
      or p.id::text = p_query
   order by p.created_at desc
   limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

-- Everything an admin needs to review one member, as one JSON document.
create or replace function public.admin_member_detail(p_target uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'email', u.email,
    'private', (select to_jsonb(pp) from public.profile_private pp where pp.id = p.id),
    'surrogate', (select to_jsonb(sd) from public.surrogate_details sd where sd.id = p.id),
    'health', (select to_jsonb(h) from public.health_self_reports h where h.id = p.id),
    'ip', (select to_jsonb(ipd) from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(to_jsonb(ipp) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph) order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) order by c.agreed_at), '[]'::jsonb) from public.consents c where c.user_id = p.id),
    'flags', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb) from public.member_flags f where f.profile_id = p.id),
    'reports_against', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) from public.reports r where r.reported_id = p.id),
    'reports_filed', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) from public.reports r where r.reporter_id = p.id),
    'audit', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) from public.admin_audit_log a where a.target_id = p.id)
  ) into v
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = p_target;
  if v is null then raise exception 'Member not found'; end if;
  return v;
end $$;

-- Counts for the dashboard home.
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
    'new_this_week', (select count(*) from public.profiles where created_at > now() - interval '7 days')
  );
end $$;

-- -----------------------------------------------------------------------------
-- Automatic agency / contact-info flag. When a bio looks like an agency pitch
-- or contains an email, phone number or web address, add a flag for review.
-- Nothing is hidden or blocked automatically; an admin decides.
-- -----------------------------------------------------------------------------
create or replace function public.flag_suspicious_bio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_text text := lower(coalesce(new.bio, ''));
  v_kind public.flag_kind;
begin
  if new.bio is distinct from (case when tg_op = 'UPDATE' then old.bio else null end) then
    if v_text ~ '(our agency|we represent|our surrogates|our clients|agency fee|matching fee|commission|recruit|sign(ing)? bonus|egg donor agency|surrogacy agency)' then
      v_kind := 'agency_suspected';
    elsif v_text ~ '([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|(https?://|www\.|\.com\b|whatsapp|telegram|instagram|@[a-z0-9_]{3,})' then
      v_kind := 'contact_info_in_profile';
    end if;
    if v_kind is not null and not exists (
      select 1 from public.member_flags f where f.profile_id = new.id and f.kind = v_kind and f.cleared_at is null
    ) then
      insert into public.member_flags (profile_id, kind, note, created_by)
      values (new.id, v_kind, 'Added automatically from bio text', null);
    end if;
  end if;
  return new;
end $$;

create trigger profiles_flag_suspicious_bio
  after insert or update of bio on public.profiles
  for each row execute function public.flag_suspicious_bio();

-- -----------------------------------------------------------------------------
-- Admins may read any profile photo (for reviewing reports).
-- -----------------------------------------------------------------------------
create policy "Admins read all photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.is_admin());

create policy "Admins read all photo rows"
  on public.photos for select to authenticated using (public.is_admin());
