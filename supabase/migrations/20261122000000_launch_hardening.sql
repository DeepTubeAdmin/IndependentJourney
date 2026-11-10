-- =============================================================================
-- Migration 15: launch hardening (Phase 10).
--
-- Three things found in the pre-launch security review:
--   1. admin_deleted_count_30d() forgot the admin check. It only returns a
--      number, but every admin_* function must refuse non-admins.
--   2. "Download a copy of your data": export_my_data() returns everything we
--      hold about the signed-in member as one JSON document (a data-rights
--      requirement, and expected by the app stores).
--   4. The "allowed_states" setting existed but nothing enforced it. A trigger
--      now refuses a profile state outside the list (empty list = every state).
--   3. Belt and braces: anonymous visitors can never call admin_* functions,
--      even if a future function forgets assert_admin(), and members cannot
--      write audit-log rows through the internal admin_log() helper.
-- Safe to run twice.
-- =============================================================================

-- 1. Admin check that was missing.
create or replace function public.admin_deleted_count_30d()
returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return (select count(*)::integer from public.deleted_accounts where deleted_at > now() - interval '30 days');
end $$;

-- 2. Data export. Contact details and answers are the member's own, so they
-- are included; the other side of each conversation is identified only by
-- display name. Nothing about other members beyond that is included.
create or replace function public.export_my_data()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at) from auth.users u where u.id = v_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_id),
    'private_details', (select to_jsonb(pp) - 'id' from public.profile_private pp where pp.id = v_id),
    'surrogate_answers', (select to_jsonb(sd) - 'id' from public.surrogate_details sd where sd.id = v_id),
    'health_self_reports', (select to_jsonb(h) - 'id' from public.health_self_reports h where h.id = v_id),
    'intended_parent_answers', (select to_jsonb(ipd) - 'id' from public.ip_details ipd where ipd.id = v_id),
    'parents', (select jsonb_agg(jsonb_build_object('first_name', ipp.first_name, 'age', ipp.age) order by ipp.position) from public.ip_parents ipp where ipp.profile_id = v_id),
    'photos', (select jsonb_agg(ph.storage_path order by ph.position) from public.photos ph where ph.profile_id = v_id),
    'consents', (select jsonb_agg(jsonb_build_object('document', c.document, 'version', c.version, 'agreed_at', c.agreed_at)) from public.consents c where c.user_id = v_id),
    'memberships', (select jsonb_agg(jsonb_build_object('status', m.status, 'source', m.source, 'current_period_end', m.current_period_end)) from public.memberships m where m.user_id = v_id),
    'identity_checks', (select jsonb_agg(jsonb_build_object('status', ic.status, 'created_at', ic.created_at)) from public.identity_checks ic where ic.user_id = v_id),
    'saved_profiles', (select jsonb_agg(jsonb_build_object('display_name', p.display_name, 'saved_at', sp.created_at)) from public.saved_profiles sp join public.profiles p on p.id = sp.profile_id where sp.user_id = v_id),
    'saved_searches', (select jsonb_agg(jsonb_build_object('name', ss.name, 'filters', ss.filters, 'alerts', ss.alerts)) from public.saved_searches ss where ss.user_id = v_id),
    'email_preferences', (select to_jsonb(ns) - 'user_id' from public.notification_settings ns where ns.user_id = v_id),
    'blocked_members', (select jsonb_agg(p.display_name) from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = v_id),
    'reports_filed', (select jsonb_agg(jsonb_build_object('reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at)) from public.reports r where r.reporter_id = v_id),
    'conversations', (
      select jsonb_agg(jsonb_build_object(
        'with', (select p.display_name from public.profiles p where p.id = case when c.surrogate_id = v_id then c.ip_id else c.surrogate_id end),
        'started_at', c.created_at,
        'messages', (select jsonb_agg(jsonb_build_object('sent_by_me', m.sender_id = v_id, 'body', m.body, 'sent_at', m.created_at) order by m.created_at)
                       from public.messages m where m.conversation_id = c.id and not m.admin_hidden)
      ) order by c.created_at)
      from public.conversations c where c.surrogate_id = v_id or c.ip_id = v_id)
  ));
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- 3. No admin_* function is callable by anonymous visitors, and admin_log()
-- (the audit-log writer) is internal: only the admin functions call it, so no
-- member can write audit rows directly.
revoke execute on function public.admin_log(text, uuid, jsonb) from public, anon, authenticated;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'admin\_%' and p.proname <> 'admin_log'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- 4. Enforce the state allow-list. Admin → Settings → allowed_states holds a
-- JSON list of two-letter codes, for example ["TX","CA"]. Empty means open to
-- all. Existing members outside the list are left alone until they change
-- their state. The message is shown to the member on the location step.
create or replace function public.tg_check_allowed_state()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_allowed jsonb;
begin
  if new.state = '' or (tg_op = 'UPDATE' and new.state = old.state) then return new; end if;
  select value into v_allowed from public.app_settings where key = 'allowed_states';
  if v_allowed is null or jsonb_typeof(v_allowed) <> 'array' or jsonb_array_length(v_allowed) = 0 then return new; end if;
  if not (v_allowed ? new.state) then
    raise exception 'Independent Journey is not open to members in % yet. Email us if you would like to be told when it is.', new.state
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists profiles_allowed_state on public.profiles;
create trigger profiles_allowed_state
  before insert or update of state on public.profiles
  for each row execute function public.tg_check_allowed_state();
