-- =============================================================================
-- Push notification tests (mobile step 3): devices, the switch, what is sent.
-- pg_net is replaced by a stand-in that records each call.
-- =============================================================================
begin;

create schema if not exists net;
create table net.calls (url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
returns bigint language plpgsql security definer as $$
begin insert into net.calls values (url, body, headers); return 1; end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000091', 'puship@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000092', 'pushsur@test', '{"role":"surrogate"}');

create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create or replace function pg_temp.admin_mode() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;

do $$
declare ip text := '00000000-0000-0000-0000-000000000091'; sur text := '00000000-0000-0000-0000-000000000092';
        conv uuid; b jsonb;
begin
  perform pg_temp.admin_mode();
  update public.profiles set display_name = 'Pat' where id = ip::uuid;
  update public.profiles set display_name = 'Sam' where id = sur::uuid;

  -- A member registers their phone; junk tokens are refused.
  perform pg_temp.login(ip);
  perform public.register_push_device('ExponentPushToken[abc123]', 'ios');
  perform public.register_push_device('ExponentPushToken[abc123]', 'ios');
  begin
    perform public.register_push_device('https://evil.example/hook', 'ios');
    raise exception 'junk token accepted';
  exception when invalid_parameter_value then null; end;
  -- Members cannot read the device table, their own row included.
  begin
    perform 1 from public.push_devices;
    assert (select count(*) from public.push_devices) = 0, 'members should not see devices';
  exception when insufficient_privilege then null; end;
  assert (public.my_notification_settings() ->> 'push_messages')::boolean, 'push defaults on';
  begin
    perform public.send_push(ip::uuid, 'x', 'y');
    raise exception 'member could call send_push';
  exception when insufficient_privilege then null; end;

  perform pg_temp.admin_mode();
  assert (select count(*) from public.push_devices where user_id = ip::uuid) = 1, 'one row per phone';

  -- A message to Pat sends one push naming the sender, never the text.
  insert into public.conversations (surrogate_id, ip_id, started_by) values (sur::uuid, ip::uuid, sur::uuid) returning id into conv;
  insert into public.messages (conversation_id, sender_id, body) values (conv, sur::uuid, 'my private words');
  assert (select count(*) from net.calls) = 1, 'one push call expected';
  select body into b from net.calls;
  assert (select url from net.calls) = 'https://exp.host/--/api/v2/push/send', 'wrong push address';
  assert jsonb_array_length(b) = 1 and b -> 0 ->> 'to' = 'ExponentPushToken[abc123]', 'push goes to the registered phone';
  assert b -> 0 ->> 'body' = 'Sam sent you a message', 'push names the sender: ' || (b -> 0 ->> 'body');
  assert b::text not like '%private words%', 'push must not contain the message';
  assert b -> 0 -> 'data' ->> 'url' = '/messages/' || conv, 'push opens the conversation';
  assert (b -> 0 ->> 'badge')::integer = 1, 'badge is the unread count';

  -- The sender has no phone registered: a reply sends nothing.
  insert into public.messages (conversation_id, sender_id, body) values (conv, ip::uuid, 'reply');
  assert (select count(*) from net.calls) = 1, 'no phone, no push';

  -- Switching pushes off stops them; email settings are untouched.
  perform pg_temp.login(ip);
  perform public.set_notification_settings('{"push_messages": false}'::jsonb);
  assert not (public.my_notification_settings() ->> 'push_messages')::boolean, 'switch saves';
  assert (public.my_notification_settings() ->> 'new_messages')::boolean, 'email setting unchanged';
  perform pg_temp.admin_mode();
  insert into public.messages (conversation_id, sender_id, body) values (conv, sur::uuid, 'second');
  assert (select count(*) from net.calls) = 1, 'switched off, no push';

  -- A settings save without the key (older website copy) keeps the choice.
  perform pg_temp.login(ip);
  perform public.set_notification_settings('{"new_messages": true}'::jsonb);
  assert not (public.my_notification_settings() ->> 'push_messages')::boolean, 'missing key keeps the push choice';
  perform public.set_notification_settings('{"push_messages": true}'::jsonb);

  -- Someone else signing in on the same phone takes it over; signing out removes it.
  perform pg_temp.login(sur);
  perform public.register_push_device('ExponentPushToken[abc123]', 'ios');
  perform pg_temp.admin_mode();
  assert (select user_id from public.push_devices where token = 'ExponentPushToken[abc123]') = sur::uuid, 'phone moves to the new login';
  perform pg_temp.login(ip);
  perform public.unregister_push_device('ExponentPushToken[abc123]');
  perform pg_temp.admin_mode();
  assert (select count(*) from public.push_devices) = 1, 'cannot remove someone else''s phone';
  perform pg_temp.login(sur);
  perform public.unregister_push_device('ExponentPushToken[abc123]');
  perform pg_temp.admin_mode();
  assert (select count(*) from public.push_devices) = 0, 'sign-out removes the phone';

  -- A failing push service never blocks a message.
  perform pg_temp.login(ip);
  perform public.register_push_device('ExponentPushToken[abc123]', 'ios');
  perform pg_temp.admin_mode();
  drop table net.calls;
  insert into public.messages (conversation_id, sender_id, body) values (conv, sur::uuid, 'still delivered');
  assert (select count(*) from public.messages where conversation_id = conv) = 4, 'message saved even when push fails';
end $$;

rollback;
select 'PUSH RULES OK' as result;
