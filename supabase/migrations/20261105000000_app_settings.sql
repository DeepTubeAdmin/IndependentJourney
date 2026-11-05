-- =============================================================================
-- Migration 1: admin roles + app settings
--
-- Every table has row-level security (RLS) turned on. With RLS on and no
-- matching policy, the database refuses the request. Policies below open up
-- exactly what each kind of user is allowed to do.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin roles: which users are admins. Managed in the database, never by
-- hardcoded emails. Add the first admin by hand in the Supabase SQL editor:
--   insert into public.admin_roles (user_id) values ('<your auth user id>');
-- -----------------------------------------------------------------------------
create table public.admin_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'admin' check (role in ('admin')),
  created_at  timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

-- Returns true when the signed-in user is an admin who has completed
-- two-factor authentication in this session (Supabase "aal2").
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles where user_id = auth.uid()
  )
  and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create policy "Admins can see the admin list"
  on public.admin_roles for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- App settings: one row per setting. Price and term live here and nowhere
-- else, so they can be changed without a code release.
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

alter table public.app_settings enable row level security;

create policy "Anyone can read settings"
  on public.app_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can change settings"
  on public.app_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value, description) values
  ('membership_price_usd', '199', 'Intended parent membership price per term, in US dollars'),
  ('membership_term_months', '3', 'Length of one membership term, in months'),
  ('surrogate_new_conversations_per_day_verified', '10', 'Daily new-conversation limit, verified surrogates'),
  ('surrogate_new_conversations_per_day_unverified', '3', 'Daily new-conversation limit, unverified surrogates'),
  ('allowed_states', '[]', 'US state codes allowed to sign up. Empty list = all states');
