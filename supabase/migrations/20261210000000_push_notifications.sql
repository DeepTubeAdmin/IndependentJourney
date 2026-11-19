-- =============================================================================
-- Migration 33: push notifications for the phone apps (mobile step 3).
--
-- What it adds:
--   * push_devices: which phones belong to which login. The app saves its
--     push address ("token") here after the member allows notifications.
--   * A "push_messages" switch next to the email preferences (default on).
--   * When a message is sent, the recipient's phones get a notification right
--     away through Expo's push service. The notification shows WHO wrote, never
--     what they wrote, so nothing private appears on a lock screen.
--
-- Only new messages send a push. Everything else stays email-only.
-- Sending a push can never stop a message from being delivered: any failure
-- is swallowed. Safe to run more than once.
-- =============================================================================

-- pg_net lets the database call a web address. Supabase ships it; on a plain
-- test database it is missing and pushes are simply skipped.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available here; push notifications will be skipped.';
end $$;

-- -----------------------------------------------------------------------------
-- 1. Devices
-- -----------------------------------------------------------------------------
create table if not exists public.push_devices (
  token        text primary key check (char_length(token) between 10 and 300),
  user_id      uuid not null references auth.users (id) on delete cascade,
  platform     text not null default '' check (platform in ('', 'ios', 'android')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_devices_user_idx on public.push_devices (user_id);
alter table public.push_devices enable row level security;
-- No policies: browsers and apps never read this table directly. They use the
-- two functions below.

-- The app calls this each time it opens while signed in. A phone belongs to
-- whoever signed in on it last.
create or replace function public.register_push_device(p_token text, p_platform text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Not a push token' using errcode = '22023';
  end if;
  insert into public.push_devices (token, user_id, platform)
  values (p_token, auth.uid(), case when p_platform in ('ios', 'android') then p_platform else '' end)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
  -- Phones that have not opened the app in six months are forgotten.
  delete from public.push_devices d where d.last_seen_at < now() - interval '180 days';
end $$;
revoke execute on function public.register_push_device(text, text) from public, anon;
grant execute on function public.register_push_device(text, text) to authenticated;

-- The app calls this when the member signs out on that phone.
create or replace function public.unregister_push_device(p_token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_devices d where d.token = p_token and d.user_id = auth.uid();
$$;
revoke execute on function public.unregister_push_device(text) from public, anon;
grant execute on function public.unregister_push_device(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. The on/off switch (Settings)
-- -----------------------------------------------------------------------------
alter table public.notification_settings
  add column if not exists push_messages boolean not null default true;

create or replace function public.my_notification_settings()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('new_messages', s.new_messages, 'membership', s.membership,
                               'saved_searches', s.saved_searches, 'nudges', s.nudges,
                               'push_messages', s.push_messages)
       from public.notification_settings s where s.user_id = auth.uid()),
    '{"new_messages": true, "membership": true, "saved_searches": true, "nudges": true, "push_messages": true}'::jsonb);
$$;

create or replace function public.set_notification_settings(p jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  insert into public.notification_settings (user_id, new_messages, membership, saved_searches, nudges, push_messages)
  values (auth.uid(),
          coalesce((p ->> 'new_messages')::boolean, true), coalesce((p ->> 'membership')::boolean, true),
          coalesce((p ->> 'saved_searches')::boolean, true), coalesce((p ->> 'nudges')::boolean, true),
          coalesce((p ->> 'push_messages')::boolean, true))
  on conflict (user_id) do update
    set new_messages = excluded.new_messages, membership = excluded.membership,
        saved_searches = excluded.saved_searches, nudges = excluded.nudges,
        -- An older copy of the website does not send this key; leave it alone then.
        push_messages = case when p ? 'push_messages' then excluded.push_messages
                             else public.notification_settings.push_messages end,
        updated_at = now();
end $$;

-- -----------------------------------------------------------------------------
-- 3. Sending
-- -----------------------------------------------------------------------------
-- Unread messages waiting for a login, across its own profile and (for an
-- agency) every client profile it manages. Shown as the number on the app icon.
create or replace function public.unread_count_for(p_login uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.profiles r on r.id = case when m.sender_id = c.surrogate_id then c.ip_id else c.surrogate_id end
   where coalesce(r.managed_by, r.id) = p_login and m.read_at is null and not m.admin_hidden;
$$;
revoke execute on function public.unread_count_for(uuid) from public, anon, authenticated;

-- Hands one notification per phone to Expo's push service. Does nothing when
-- the login has no phones, switched pushes off, or pg_net is missing.
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb, p_badge integer default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_messages jsonb;
begin
  if to_regproc('net.http_post') is null then return; end if;
  if exists (select 1 from public.notification_settings s where s.user_id = p_user and not s.push_messages) then return; end if;
  if exists (select 1 from public.profiles p where p.id = p_user and p.banned_at is not null) then return; end if;
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'to', d.token, 'title', p_title, 'body', p_body, 'data', p_data,
           'sound', 'default', 'badge', p_badge, 'channelId', 'messages', 'priority', 'high')))
    into v_messages
    from (select token from public.push_devices where user_id = p_user order by last_seen_at desc limit 20) d;
  if v_messages is null then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using 'https://exp.host/--/api/v2/push/send', v_messages,
          '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
exception when others then
  -- A push is a courtesy; it must never break whatever triggered it.
  null;
end $$;
revoke execute on function public.send_push(uuid, text, text, jsonb, integer) from public, anon, authenticated;

-- New message: notify the other person's phones (or their agency's).
create or replace function public.tg_push_new_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations; v_to public.profiles; v_sender public.profiles; v_login uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select * into v_to from public.profiles where id = case when new.sender_id = c.surrogate_id then c.ip_id else c.surrogate_id end;
  select * into v_sender from public.profiles where id = new.sender_id;
  v_login := coalesce(v_to.managed_by, v_to.id);
  -- Nothing to do if there is no recipient, or the same login is on both sides.
  if v_login is null or v_login = coalesce(v_sender.managed_by, v_sender.id) then return new; end if;
  perform public.send_push(
    v_login,
    'New message',
    case when v_to.managed_by is not null
         then coalesce(v_sender.display_name, 'A member') || ' wrote to ' || coalesce(v_to.display_name, 'your client')
         else coalesce(v_sender.display_name, 'A member') || ' sent you a message' end,
    jsonb_build_object('url', '/messages/' || c.id, 'conversation_id', c.id),
    public.unread_count_for(v_login));
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists push_new_message on public.messages;
create trigger push_new_message after insert on public.messages for each row execute function public.tg_push_new_message();
