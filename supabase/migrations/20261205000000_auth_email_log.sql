-- Migration 28: log of login emails (confirm sign-up, password reset, email
-- change, log-in link) sent by the auth-email Edge Function.
--
-- Why: members report "I never got the confirmation email". This table shows,
-- per attempt, whether Resend accepted it and if not, why. Admins can read it
-- in Supabase → Table Editor → auth_email_log (newest first). Nothing else in
-- the app depends on it, and the function keeps sending even if a log insert
-- fails.
--
-- Safe to run more than once.

create table if not exists public.auth_email_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  user_id      uuid,                      -- not a foreign key: keep rows after account deletion
  email        text not null,
  action       text not null,             -- signup, recovery, email_change, magiclink, ...
  status       text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id  text,                      -- Resend's id for the email, to look it up in Resend → Emails
  error        text
);

create index if not exists auth_email_log_created_idx on public.auth_email_log (created_at desc);
create index if not exists auth_email_log_email_idx on public.auth_email_log (lower(email));

alter table public.auth_email_log enable row level security;

-- Only admins may read the log; only the service role (the Edge Function) writes it.
drop policy if exists "Admins can read the login email log" on public.auth_email_log;
create policy "Admins can read the login email log"
  on public.auth_email_log for select
  to authenticated
  using (public.is_admin());

revoke all on public.auth_email_log from anon, authenticated;
grant select on public.auth_email_log to authenticated;

-- Housekeeping helper: removes rows older than 90 days. Run it now and then
-- from the SQL editor:  select public.prune_auth_email_log();
create or replace function public.prune_auth_email_log()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.auth_email_log where created_at < now() - interval '90 days' returning 1
  )
  select count(*)::integer from gone;
$$;
revoke all on function public.prune_auth_email_log() from public, anon, authenticated;
