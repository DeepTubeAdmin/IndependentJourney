-- =============================================================================
-- Admin-rule tests. Run after the migrations (tests/db/run.sh does this).
-- Checks that only admins with two-factor auth can act, that every action is
-- logged, that members can file and see only their own reports, and that the
-- automatic bio flag fires.
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-00000000000b', 'member@test', '{"role":"surrogate"}'),
  ('00000000-0000-0000-0000-00000000000c', 'other@test', '{"role":"intended_parent"}');
insert into public.admin_roles (user_id) values ('00000000-0000-0000-0000-00000000000a');

create or replace function pg_temp.login(uid text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- A plain member cannot run admin functions and cannot see flags or the log.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert public.am_i_admin_candidate() = false, 'member is not an admin candidate';
  begin
    perform public.admin_set_verified('00000000-0000-0000-0000-00000000000c', true, 'x');
    raise exception 'member must not verify others';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.member_flags) = 0, 'member sees no flags';
  assert (select count(*) from public.admin_audit_log) = 0, 'member sees no audit log';
end $$;

-- A member can report another member and read only their own report.
insert into public.reports (reporter_id, reported_id, reason, details)
values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'scam_or_money', 'Asked me to wire money');
do $$ begin
  assert (select count(*) from public.reports) = 1, 'reporter sees own report';
  begin
    update public.reports set status = 'resolved';
    -- RLS silently updates zero rows; verify nothing changed.
  end;
  assert (select status from public.reports limit 1) = 'open', 'reporter cannot resolve a report';
end $$;

-- Another member sees no reports at all.
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from public.reports) = 0, 'other member sees no reports';
end $$;

-- Admin WITHOUT two-factor auth is blocked.
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal1');
do $$ begin
  assert public.am_i_admin_candidate() = true, 'admin is a candidate before 2FA';
  assert public.is_admin() = false, 'admin without 2FA is not yet an admin';
  begin
    perform public.admin_overview();
    raise exception 'admin without 2FA must be blocked';
  exception when insufficient_privilege then null; end;
end $$;

-- Admin WITH two-factor auth can act, and every action is logged.
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
do $$
declare v_flag bigint; v_report bigint;
begin
  assert public.is_admin(), 'admin with 2FA is an admin';
  assert (public.admin_overview() ->> 'open_reports')::int = 1, 'overview counts the open report';

  perform public.admin_set_verified('00000000-0000-0000-0000-00000000000b', true, 'checked by hand');
  assert (select is_verified from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'member is now verified';

  perform public.admin_set_member_status('00000000-0000-0000-0000-00000000000c', 'suspend', 'scam report', now() + interval '30 days');
  assert (select suspended_until from public.profiles where id = '00000000-0000-0000-0000-00000000000c') is not null, 'member suspended';

  v_flag := public.admin_add_flag('00000000-0000-0000-0000-00000000000c', 'fraud_suspected', 'wire transfer request');
  perform public.admin_clear_flag(v_flag, 'false alarm');
  assert (select cleared_at from public.member_flags where id = v_flag) is not null, 'flag cleared';

  select id into v_report from public.reports limit 1;
  perform public.admin_resolve_report(v_report, 'resolved', 'suspended the reported member');
  assert (select status from public.reports where id = v_report) = 'resolved', 'report resolved';

  perform public.admin_set_setting('membership_price_usd', '249'::jsonb);
  assert (select value from public.app_settings where key = 'membership_price_usd') = '249'::jsonb, 'setting updated';

  assert (select count(*) from public.admin_audit_log) = 6, 'six actions produce six audit rows';
  assert (select count(*) from public.admin_search_members('member@test')) = 1, 'search by email works';
  assert (public.admin_member_detail('00000000-0000-0000-0000-00000000000b') ->> 'email') = 'member@test', 'detail includes email';
end $$;

-- Automatic flag: a bio that reads like an agency pitch, or contains contact info.
reset role;
update public.profiles set bio = 'Our agency represents dozens of surrogates, low matching fee!' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set bio = 'Text me at 512-555-1234 or find me on instagram' where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert exists (select 1 from public.member_flags where profile_id = '00000000-0000-0000-0000-00000000000c' and kind = 'agency_suspected' and cleared_at is null), 'agency bio flagged';
  assert exists (select 1 from public.member_flags where profile_id = '00000000-0000-0000-0000-00000000000b' and kind = 'contact_info_in_profile' and cleared_at is null), 'contact info flagged';
end $$;

select 'ADMIN RULES OK' as result;
rollback;
