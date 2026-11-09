-- =============================================================================
-- Migration 7 (Phase 6): messaging.
-- Safe to run more than once.
--
-- Rules (from the access table, plus Seth's decisions):
--   * A conversation is always one surrogate + one intended parent.
--   * Surrogates may message once their profile is complete.
--   * Intended parents may message with an active membership. Without one,
--     a message TO them is delivered but LOCKED: they see that it arrived and
--     the sender's preview, but not the text, until they have a membership.
--   * Daily limits on new conversations (settings), stricter for unverified.
--   * Every message is scanned for scam patterns; matches warn the recipient
--     and flag the sender for admins.
--   * Members can block each other. Admins can review messages (logged),
--     hide a message, and warn members.
--   * Surrogates may share their health self-report inside a conversation.
-- =============================================================================

-- Settings ------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('ip_new_conversations_per_day_verified',   '10', 'Daily new-conversation limit, verified intended parents'),
  ('ip_new_conversations_per_day_unverified', '3',  'Daily new-conversation limit, unverified intended parents'),
  ('messages_per_day_unverified',             '60', 'Daily message cap for members who have not verified their identity'),
  ('messages_per_day_verified',               '300','Daily message cap for verified members')
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_settings where key = p_key), p_default);
$$;

-- Tables --------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "Own blocks" on public.blocks;
create policy "Own blocks" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  surrogate_id     uuid not null references public.profiles (id) on delete cascade,
  ip_id            uuid not null references public.profiles (id) on delete cascade,
  started_by       uuid not null references public.profiles (id),
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (surrogate_id, ip_id)
);
alter table public.conversations enable row level security;
create index if not exists conversations_surrogate_idx on public.conversations (surrogate_id, last_message_at desc);
create index if not exists conversations_ip_idx on public.conversations (ip_id, last_message_at desc);

create table if not exists public.messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id),
  body             text not null check (char_length(body) between 1 and 4000),
  scam_flags       text[] not null default '{}',
  admin_hidden     boolean not null default false,
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);
alter table public.messages enable row level security;
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_sender_day_idx on public.messages (sender_id, created_at);
create index if not exists messages_flagged_idx on public.messages (created_at desc) where cardinality(scam_flags) > 0;

-- Notices: warnings from the safety team, shown on the member's home page.
create table if not exists public.member_notices (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  seen_at     timestamptz
);
alter table public.member_notices enable row level security;
drop policy if exists "Own notices" on public.member_notices;
create policy "Own notices" on public.member_notices for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Mark own notices seen" on public.member_notices;
create policy "Mark own notices seen" on public.member_notices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Health self-report sharing: the surrogate chooses, per intended parent.
create table if not exists public.health_shares (
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  viewer_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id)
);
alter table public.health_shares enable row level security;
drop policy if exists "Owner manages health shares" on public.health_shares;
create policy "Owner manages health shares" on public.health_shares for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Viewer sees own health shares" on public.health_shares;
create policy "Viewer sees own health shares" on public.health_shares for select to authenticated using (viewer_id = auth.uid());
drop policy if exists "Shared health" on public.health_self_reports;
create policy "Shared health" on public.health_self_reports for select to authenticated
  using (exists (select 1 from public.health_shares hs where hs.owner_id = health_self_reports.id and hs.viewer_id = auth.uid())
         and public.has_active_membership());

-- Who may read what ---------------------------------------------------------
-- The viewer can read incoming messages unless they are an intended parent
-- without a membership (then incoming messages are locked).
create or replace function public.can_read_incoming(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = p_user
      and (p.role = 'surrogate' or public.has_active_membership(p_user))
  );
$$;

drop policy if exists "Participants see conversations" on public.conversations;
create policy "Participants see conversations" on public.conversations for select to authenticated
  using (surrogate_id = auth.uid() or ip_id = auth.uid() or public.is_admin());

drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages" on public.messages for select to authenticated
  using (
    not admin_hidden
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id and (c.surrogate_id = auth.uid() or c.ip_id = auth.uid()))
    and (sender_id = auth.uid() or public.can_read_incoming())
  );
-- Inserts happen only through send_message(); no insert policy on purpose.

-- Can the signed-in member message p_target? Returns a reason code.
create or replace function public.can_message(p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare me public.profiles; them public.profiles;
begin
  if auth.uid() is null then return 'sign_in'; end if;
  select * into me from public.profiles where id = auth.uid();
  select * into them from public.profiles where id = p_target;
  if me.id is null or them.id is null or me.id = them.id then return 'not_available'; end if;
  if me.role = them.role then return 'same_role'; end if;
  if not public.profile_is_live(them) then return 'not_available'; end if;
  if me.banned_at is not null or (me.suspended_until is not null and me.suspended_until > now()) then return 'account_restricted'; end if;
  if public.is_blocked_between(me.id, them.id) then return 'blocked'; end if;
  if me.role = 'surrogate' and not me.is_complete then return 'profile_incomplete'; end if;
  if me.role = 'intended_parent' and not public.has_active_membership(me.id) then return 'membership_required'; end if;
  return 'ok';
end $$;

-- Scam pattern scan. Returns flag names found in the text.
create or replace function public.scan_message(p_body text, p_message_count integer)
returns text[]
language plpgsql immutable
as $$
declare flags text[] := '{}';
begin
  if p_body ~* '(gift ?cards?|wire transfer|western union|moneygram|zelle|venmo|cash ?app|paypal|crypto|bitcoin|\bbtc\b|usdt|ethereum|processing fee|admin(istration)? fee|registration fee|upfront payment|advance payment|send (me )?(the )?(money|funds)|deposit (first|now|before))' then
    flags := array_append(flags, 'money_request');
  end if;
  if p_message_count < 3 and p_body ~* '(whatsapp|telegram|signal app|text me at|\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})' then
    flags := array_append(flags, 'early_contact_info');
  end if;
  return flags;
end $$;

-- Send a message. Creates the conversation if needed. Enforces every rule.
-- Returns {conversation_id, message_id, status: 'delivered' | 'locked', flags}.
create or replace function public.send_message(p_to uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := public.can_message(p_to);
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

  select * into me from public.profiles where id = auth.uid();
  if me.role = 'surrogate' then v_surrogate := me.id; v_ip := p_to; else v_surrogate := p_to; v_ip := me.id; end if;

  -- Daily message cap.
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

  insert into public.messages (conversation_id, sender_id, body, scam_flags)
  values (v_conv.id, me.id, p_body, v_flags) returning id into v_msg_id;
  update public.conversations set last_message_at = now() where id = v_conv.id;

  -- Money talk flags the sender for the safety team (once per open flag).
  if 'money_request' = any (v_flags) and not exists (
      select 1 from public.member_flags f where f.profile_id = me.id and f.kind = 'fraud_suspected' and f.cleared_at is null and f.note like 'Scam pattern in message%') then
    insert into public.member_flags (profile_id, kind, note) values (me.id, 'fraud_suspected', 'Scam pattern in message #' || v_msg_id || ' (money request)');
  end if;

  v_locked := not public.can_read_incoming(p_to);
  return jsonb_build_object('conversation_id', v_conv.id, 'message_id', v_msg_id,
                            'status', case when v_locked then 'locked' else 'delivered' end,
                            'flags', to_jsonb(v_flags), 'new_conversation', v_is_new);
end $$;
grant execute on function public.send_message(uuid, text) to authenticated;

-- Inbox: one row per conversation for the signed-in member.
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_name text, other_state text, other_role public.user_role,
  other_verified boolean, other_photo_path text, last_message_at timestamptz, last_preview text,
  unread integer, locked boolean, blocked boolean
)
language sql stable security definer set search_path = ''
as $$
  select c.id, o.id, o.display_name, o.state, o.role, o.is_verified, public.first_photo_path(o.id), c.last_message_at,
         case when public.can_read_incoming() then (select left(m.body, 90) from public.messages m where m.conversation_id = c.id and not m.admin_hidden order by m.created_at desc limit 1) end,
         (select count(*)::integer from public.messages m where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null and not m.admin_hidden),
         not public.can_read_incoming(),
         public.is_blocked_between(auth.uid(), o.id)
    from public.conversations c
    join public.profiles o on o.id = case when c.surrogate_id = auth.uid() then c.ip_id else c.surrogate_id end
   where c.surrogate_id = auth.uid() or c.ip_id = auth.uid()
   order by c.last_message_at desc;
$$;
grant execute on function public.my_conversations() to authenticated;

-- Mark everything from the other person as read.
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.messages m set read_at = now()
   where m.conversation_id = p_conversation and m.sender_id <> auth.uid() and m.read_at is null
     and public.can_read_incoming()
     and exists (select 1 from public.conversations c where c.id = p_conversation and (c.surrogate_id = auth.uid() or c.ip_id = auth.uid()));
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Total unread for the home page badge (locked messages count too).
create or replace function public.my_unread_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where (c.surrogate_id = auth.uid() or c.ip_id = auth.uid())
     and m.sender_id <> auth.uid() and m.read_at is null and not m.admin_hidden;
$$;
grant execute on function public.my_unread_count() to authenticated;

-- Admin: message review -------------------------------------------------------
-- Every call is written to the audit log (who looked, what for).
create or replace function public.admin_search_messages(p_query text default '', p_member uuid default null, p_flagged_only boolean default false, p_limit integer default 50, p_offset integer default 0)
returns table (
  id bigint, conversation_id uuid, sender_id uuid, sender_name text, recipient_id uuid, recipient_name text,
  body text, scam_flags text[], admin_hidden boolean, created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  perform public.admin_log('message_search', p_member, jsonb_build_object('query', p_query, 'flagged_only', p_flagged_only, 'offset', p_offset));
  return query
  select m.id, m.conversation_id, m.sender_id, s.display_name, r.id, r.display_name, m.body, m.scam_flags, m.admin_hidden, m.created_at
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.profiles s on s.id = m.sender_id
    join public.profiles r on r.id = case when c.surrogate_id = m.sender_id then c.ip_id else c.surrogate_id end
   where (p_member is null or m.sender_id = p_member or c.surrogate_id = p_member or c.ip_id = p_member)
     and (not p_flagged_only or cardinality(m.scam_flags) > 0)
     and (coalesce(p_query, '') = '' or m.body ilike '%' || p_query || '%' or s.display_name ilike '%' || p_query || '%' or r.display_name ilike '%' || p_query || '%')
   order by m.created_at desc
   limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

create or replace function public.admin_conversation(p_conversation uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare c public.conversations;
begin
  perform public.assert_admin();
  select * into c from public.conversations where id = p_conversation;
  if c.id is null then return null; end if;
  perform public.admin_log('message_review', c.surrogate_id, jsonb_build_object('conversation_id', p_conversation, 'ip_id', c.ip_id));
  return jsonb_build_object(
    'conversation', to_jsonb(c),
    'surrogate', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'is_verified', p.is_verified, 'banned_at', p.banned_at, 'suspended_until', p.suspended_until) from public.profiles p where p.id = c.surrogate_id),
    'ip', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'is_verified', p.is_verified, 'banned_at', p.banned_at, 'suspended_until', p.suspended_until) from public.profiles p where p.id = c.ip_id),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]'::jsonb) from public.messages m where m.conversation_id = c.id)
  );
end $$;

create or replace function public.admin_hide_message(p_message bigint, p_hidden boolean, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_sender uuid;
begin
  perform public.assert_admin();
  update public.messages set admin_hidden = p_hidden where id = p_message returning sender_id into v_sender;
  perform public.admin_log(case when p_hidden then 'hide_message' else 'unhide_message' end, v_sender, jsonb_build_object('message_id', p_message, 'reason', p_reason));
end $$;

create or replace function public.admin_warn_member(p_target uuid, p_body text, p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  insert into public.member_notices (user_id, body, created_by) values (p_target, p_body, auth.uid());
  perform public.admin_log('warn_member', p_target, jsonb_build_object('body', p_body, 'reason', p_reason));
end $$;

-- Overview gains message counts.
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
    'flagged_messages_open', (select count(*) from public.messages where cardinality(scam_flags) > 0 and created_at > now() - interval '30 days')
  );
end $$;

-- Member detail gains notices and conversation count (no message text here;
-- reading messages goes through admin_conversation so it is logged).
