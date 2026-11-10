-- =============================================================================
-- Migration 11: email notifications and saved searches (Phase 8a).
--
-- How it works: things that happen in the database (a new message, a payment,
-- an ID-check result, a new member) drop a row into email_outbox. Every few
-- minutes the "send-emails" Edge Function (run on a schedule) claims queued
-- rows, sends them through Resend, and marks them sent. Members can turn each
-- category off in Settings. Safe to run twice.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Per-member email preferences. No row = everything on.
-- -----------------------------------------------------------------------------
create table if not exists public.notification_settings (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  new_messages    boolean not null default true,   -- new and locked messages
  membership      boolean not null default true,   -- receipts, ending soon, ended
  saved_searches  boolean not null default true,   -- new profiles matching a saved search
  nudges          boolean not null default true,   -- verification reminders
  updated_at      timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
drop policy if exists "Own notification settings" on public.notification_settings;
create policy "Own notification settings" on public.notification_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.my_notification_settings()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('new_messages', s.new_messages, 'membership', s.membership,
                               'saved_searches', s.saved_searches, 'nudges', s.nudges)
       from public.notification_settings s where s.user_id = auth.uid()),
    '{"new_messages": true, "membership": true, "saved_searches": true, "nudges": true}'::jsonb);
$$;

create or replace function public.set_notification_settings(p jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  insert into public.notification_settings (user_id, new_messages, membership, saved_searches, nudges)
  values (auth.uid(),
          coalesce((p ->> 'new_messages')::boolean, true), coalesce((p ->> 'membership')::boolean, true),
          coalesce((p ->> 'saved_searches')::boolean, true), coalesce((p ->> 'nudges')::boolean, true))
  on conflict (user_id) do update
    set new_messages = excluded.new_messages, membership = excluded.membership,
        saved_searches = excluded.saved_searches, nudges = excluded.nudges, updated_at = now();
end $$;

-- -----------------------------------------------------------------------------
-- Outbox: one row per email to send.
-- -----------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  template    text not null,
  payload     jsonb not null default '{}'::jsonb,
  dedupe_key  text unique,                -- stops the same email going twice
  status      text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts    integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists email_outbox_status_idx on public.email_outbox (status, id);
alter table public.email_outbox enable row level security;
drop policy if exists "Admins read outbox" on public.email_outbox;
create policy "Admins read outbox" on public.email_outbox for select to authenticated using (public.is_admin());

-- Which preference switch covers which template.
create or replace function public.email_category(p_template text)
returns text
language sql immutable
as $$
  select case
    when p_template in ('new_message', 'locked_message') then 'new_messages'
    when p_template like 'membership_%' then 'membership'
    when p_template = 'saved_search' then 'saved_searches'
    when p_template = 'verify_nudge' then 'nudges'
    else 'always'   -- welcome, identity results, security notices
  end;
$$;

-- Queues an email unless the member turned that category off, is banned, or
-- the same dedupe key was already queued.
create or replace function public.enqueue_email(p_user uuid, p_template text, p_payload jsonb default '{}'::jsonb, p_dedupe text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_cat text := public.email_category(p_template); v_on boolean := true;
begin
  if exists (select 1 from public.profiles p where p.id = p_user and p.banned_at is not null) then return; end if;
  if v_cat <> 'always' then
    select case v_cat when 'new_messages' then s.new_messages when 'membership' then s.membership
                      when 'saved_searches' then s.saved_searches else s.nudges end
      into v_on from public.notification_settings s where s.user_id = p_user;
    if v_on is false then return; end if;
  end if;
  insert into public.email_outbox (user_id, template, payload, dedupe_key)
  values (p_user, p_template, p_payload, p_dedupe)
  on conflict (dedupe_key) do nothing;
end $$;
revoke execute on function public.enqueue_email(uuid, text, jsonb, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Triggers: what creates an email.
-- -----------------------------------------------------------------------------

-- Welcome, when a profile row is created.
create or replace function public.tg_email_welcome() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_email(new.id, 'welcome', jsonb_build_object('role', new.role), 'welcome:' || new.id);
  return new;
end $$;
drop trigger if exists email_welcome on public.profiles;
create trigger email_welcome after insert on public.profiles for each row execute function public.tg_email_welcome();

-- New message: tell the other person. At most one email per conversation per
-- hour, and a different wording when the recipient cannot read it yet.
create or replace function public.tg_email_new_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations; v_to uuid; v_sender public.profiles; v_locked boolean;
begin
  select * into c from public.conversations where id = new.conversation_id;
  v_to := case when new.sender_id = c.surrogate_id then c.ip_id else c.surrogate_id end;
  select * into v_sender from public.profiles where id = new.sender_id;
  v_locked := not public.can_read_incoming(v_to);
  perform public.enqueue_email(
    v_to,
    case when v_locked then 'locked_message' else 'new_message' end,
    jsonb_build_object('conversation_id', c.id, 'sender_name', v_sender.display_name, 'sender_state', v_sender.state,
                       'sender_verified', v_sender.is_verified,
                       'preview', case when v_locked then null else left(new.body, 140) end),
    'msg:' || c.id || ':' || to_char(now(), 'YYYY-MM-DD-HH24'));
  return new;
end $$;
drop trigger if exists email_new_message on public.messages;
create trigger email_new_message after insert on public.messages for each row execute function public.tg_email_new_message();

-- ID check result.
create or replace function public.tg_email_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('verified', 'requires_input') and new.status is distinct from old.status then
    perform public.enqueue_email(new.user_id,
      case when new.status = 'verified' then 'identity_verified' else 'identity_failed' end,
      jsonb_build_object('reason', new.last_error), 'idc:' || new.id || ':' || new.status);
  end if;
  return new;
end $$;
drop trigger if exists email_identity on public.identity_checks;
create trigger email_identity after update on public.identity_checks for each row execute function public.tg_email_identity();

-- Receipt after a Stripe payment.
create or replace function public.tg_email_receipt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'stripe' and new.status = 'active' and new.last_payment_id is not null
     and (tg_op = 'INSERT' or new.last_payment_id is distinct from old.last_payment_id) then
    perform public.enqueue_email(new.user_id, 'membership_receipt',
      jsonb_build_object('period_end', new.current_period_end, 'price_usd', public.setting_int('membership_price_usd', 199),
                         'term_months', public.setting_int('membership_term_months', 3)),
      'rcpt:' || new.last_payment_id);
  end if;
  return new;
end $$;
drop trigger if exists email_receipt on public.memberships;
create trigger email_receipt after insert or update on public.memberships for each row execute function public.tg_email_receipt();

-- -----------------------------------------------------------------------------
-- Scheduled checks, run by send-emails before each batch.
-- -----------------------------------------------------------------------------

-- 7 days before a membership ends, and the day after it ended.
create or replace function public.enqueue_membership_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; m record;
begin
  for m in select * from public.memberships
            where status = 'active' and current_period_end between now() + interval '6 days' and now() + interval '8 days' loop
    perform public.enqueue_email(m.user_id, 'membership_ending',
      jsonb_build_object('period_end', m.current_period_end, 'price_usd', public.setting_int('membership_price_usd', 199)),
      'ending:' || m.user_id || ':' || m.current_period_end::date);
    n := n + 1;
  end loop;
  for m in select * from public.memberships
            where status = 'active' and current_period_end between now() - interval '2 days' and now() loop
    perform public.enqueue_email(m.user_id, 'membership_ended',
      jsonb_build_object('period_end', m.current_period_end), 'ended:' || m.user_id || ':' || m.current_period_end::date);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Gentle reminder to verify: profile complete, 3+ days old, not verified. At
-- most two reminders ever, a week apart.
create or replace function public.enqueue_verify_nudges()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; p record;
begin
  for p in select pr.id from public.profiles pr
            where pr.is_complete and not pr.is_verified and pr.banned_at is null
              and pr.created_at < now() - interval '3 days'
              and (select count(*) from public.email_outbox e where e.user_id = pr.id and e.template = 'verify_nudge') < 2
              and not exists (select 1 from public.email_outbox e where e.user_id = pr.id and e.template = 'verify_nudge'
                                 and e.created_at > now() - interval '7 days') loop
    perform public.enqueue_email(p.id, 'verify_nudge', '{}'::jsonb, 'nudge:' || p.id || ':' || to_char(now(), 'IYYY-IW'));
    n := n + 1;
  end loop;
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- Saved searches: a member keeps a set of browse filters and gets an email
-- when new profiles match. Free intended parents get names and states only
-- (the same as a limited preview); members get headline tags too.
-- -----------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  filters      jsonb not null default '{}'::jsonb,
  alerts       boolean not null default true,
  created_at   timestamptz not null default now(),
  last_run_at  timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id);
alter table public.saved_searches enable row level security;
drop policy if exists "Own saved searches" on public.saved_searches;
create policy "Own saved searches" on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.tg_saved_search_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 10 then
    raise exception 'You can keep up to 10 saved searches. Delete one first.' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists saved_search_limit on public.saved_searches;
create trigger saved_search_limit before insert on public.saved_searches for each row execute function public.tg_saved_search_limit();

-- Does a live profile match the simple filters of a saved search?
create or replace function public.profile_matches_filters(p public.profiles, f jsonb)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.profile_is_live(p)
     and (f ->> 'state' is null or p.state = f ->> 'state')
     and (coalesce((f ->> 'verified_only')::boolean, false) = false or p.is_verified)
     and (p.role <> 'surrogate' or (
           (f ->> 'open_to_twins' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.open_to_twins::text = f ->> 'open_to_twins'))
       and (f ->> 'willing_to_travel' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.willing_to_travel::text = f ->> 'willing_to_travel'))
       and (f ->> 'compensation_open' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.compensation_open = (f ->> 'compensation_open')::boolean))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.surrogate_details sd where sd.id = p.id and sd.relationship_level::text = f ->> 'relationship_level'))))
     and (p.role <> 'intended_parent' or (
           (f ->> 'family_structure' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.family_structure = f ->> 'family_structure'))
       and (f ->> 'embryos_status' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.embryos_status::text = f ->> 'embryos_status'))
       and (f ->> 'relationship_level' is null or exists (select 1 from public.ip_details d where d.id = p.id and d.relationship_level::text = f ->> 'relationship_level'))));
$$;

-- Finds profiles that became complete since each search last ran and queues
-- one email per search. Runs on the schedule.
create or replace function public.run_saved_search_alerts()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; s record; v_role public.user_role; v_full boolean; v_items jsonb; v_count integer;
begin
  for s in select ss.*, pr.role as owner_role from public.saved_searches ss join public.profiles pr on pr.id = ss.user_id
            where ss.alerts and ss.last_run_at < now() - interval '20 hours' loop
    v_role := case when s.owner_role = 'surrogate' then 'intended_parent'::public.user_role else 'surrogate'::public.user_role end;
    v_full := s.owner_role = 'surrogate' or public.has_active_membership(s.user_id);
    select count(*), coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'state', p.state,
                                 'is_verified', p.is_verified, 'headline', case when v_full then array_to_string(p.headline_tags, ' · ') end)
                                 order by p.created_at desc) filter (where rn <= 5), '[]'::jsonb)
      into v_count, v_items
      from (select p.*, row_number() over (order by p.created_at desc) rn
              from public.profiles p
             where p.role = v_role and p.id <> s.user_id and p.updated_at > s.last_run_at
               and public.profile_matches_filters(p, s.filters)) p;
    update public.saved_searches set last_run_at = now() where id = s.id;
    if v_count > 0 then
      perform public.enqueue_email(s.user_id, 'saved_search',
        jsonb_build_object('search_name', s.name, 'count', v_count, 'items', v_items, 'full', v_full),
        'ss:' || s.id || ':' || to_char(now(), 'YYYY-MM-DD'));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- What the send-emails function calls (service role only).
-- -----------------------------------------------------------------------------
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
  select u.id, u.user_id, au.email::text, p.display_name, u.template, u.payload, u.attempts
    from upd u join auth.users au on au.id = u.user_id join public.profiles p on p.id = u.user_id;
end $$;

create or replace function public.mark_email(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql security definer set search_path = ''
as $$
  update public.email_outbox
     set status = case when p_ok then 'sent' when attempts >= 3 then 'failed' else 'queued' end,
         error = p_error, sent_at = case when p_ok then now() else sent_at end
   where id = p_id;
$$;

revoke execute on function public.enqueue_membership_reminders() from public, anon, authenticated;
revoke execute on function public.enqueue_verify_nudges() from public, anon, authenticated;
revoke execute on function public.run_saved_search_alerts() from public, anon, authenticated;
revoke execute on function public.claim_emails(integer) from public, anon, authenticated;
revoke execute on function public.mark_email(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.enqueue_membership_reminders() to service_role;
grant execute on function public.enqueue_verify_nudges() to service_role;
grant execute on function public.run_saved_search_alerts() to service_role;
grant execute on function public.claim_emails(integer) to service_role;
grant execute on function public.mark_email(bigint, boolean, text) to service_role;

-- Admin overview: email health.
create or replace function public.admin_email_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'queued', (select count(*) from public.email_outbox where status in ('queued', 'sending')),
    'sent_24h', (select count(*) from public.email_outbox where status = 'sent' and sent_at > now() - interval '24 hours'),
    'failed', (select count(*) from public.email_outbox where status = 'failed'),
    'last_sent_at', (select max(sent_at) from public.email_outbox),
    'recent_failures', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'template', e.template, 'error', e.error, 'created_at', e.created_at) order by e.id desc), '[]'::jsonb)
                          from (select * from public.email_outbox where status = 'failed' order by id desc limit 10) e)
  );
end $$;
