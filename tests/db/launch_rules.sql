-- =============================================================================
-- Launch-hardening tests (Phase 10). Run after the migrations.
-- Every admin_* function must refuse a signed-in non-admin and an anonymous
-- visitor, and the data export must return only the caller's own data.
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'member1@test', '{"role":"surrogate","display_name":"Mia"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'member2@test', '{"role":"intended_parent","display_name":"Noah"}');

create or replace function pg_temp.login(uid text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Builds a call to any function with a null for every argument.
create or replace function pg_temp.null_call(sig regprocedure) returns text language sql as $$
  select format('select %s(%s)', sig::regproc,
    (select coalesce(string_agg('null::' || format_type(t, null), ', '), '') from unnest((select proargtypes from pg_proc where oid = sig)) as t));
$$;

-- 1. Signed-in non-admin: every admin_* function raises insufficient_privilege.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$
declare f record; n int := 0;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'admin\_%' and p.proname <> 'admin_log' order by 1
  loop
    n := n + 1;
    begin
      execute pg_temp.null_call(f.sig);
      raise exception 'non-admin was able to call %', f.sig;
    exception
      when insufficient_privilege then null;
      when others then
        -- Any other error means the admin check ran first and raised, or the
        -- null arguments were rejected before the check. Only the first is
        -- acceptable, so insist on the admin message.
        if position('Admin access' in sqlerrm) = 0 then
          raise exception 'wrong failure for %: %', f.sig, sqlerrm;
        end if;
    end;
  end loop;
  assert n >= 15, format('expected many admin functions, found %s', n);
  assert not has_function_privilege('authenticated', 'public.admin_log(text, uuid, jsonb)', 'execute'), 'members cannot write audit rows';
end $$;

-- 2. Anonymous visitors cannot even execute them (grant revoked).
select pg_temp.logout();
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    assert not has_function_privilege('anon', f.sig, 'execute'), format('anon can execute %s', f.sig);
  end loop;
  assert not has_function_privilege('anon', 'public.export_my_data()', 'execute'), 'anon cannot export';
  assert not has_function_privilege('anon', 'public.delete_my_account(text)', 'execute'), 'anon cannot delete';
end $$;

-- 3. Data export: own data only, and the deleted-count fix holds.
reset role;
update public.profiles set bio = 'My own story' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set bio = 'Someone else', display_name = 'Noah' where id = '00000000-0000-0000-0000-0000000000a2';
insert into public.saved_profiles (user_id, profile_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
do $$
declare d jsonb;
begin
  d := public.export_my_data();
  assert d -> 'profile' ->> 'bio' = 'My own story', 'export has own bio';
  assert d -> 'account' ->> 'email' = 'member1@test', 'export has own email';
  assert d::text not like '%Someone else%', 'export never includes another member''s answers';
  assert (d -> 'saved_profiles' -> 0 ->> 'display_name') = 'Noah', 'saved profiles list by display name only';
  begin
    perform public.admin_deleted_count_30d();
    raise exception 'member must not read deleted counts';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. Anonymous visitor gets nothing from export.
select pg_temp.logout();
do $$ begin
  begin
    perform public.export_my_data();
    raise exception 'anon export must fail';
  exception when insufficient_privilege then null; end;
end $$;

-- 5. State allow-list: empty list allows everyone; a list refuses other states.
reset role;
update public.app_settings set value = '[]' where key = 'allowed_states';
update public.profiles set state = 'TX' where id = '00000000-0000-0000-0000-0000000000a1';
update public.app_settings set value = '["TX","CA"]' where key = 'allowed_states';
update public.profiles set state = 'CA' where id = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  begin
    update public.profiles set state = 'NY' where id = '00000000-0000-0000-0000-0000000000a1';
    raise exception 'state outside the list must be refused';
  exception when check_violation then null; end;
  assert (select state from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'CA', 'state unchanged after refusal';
end $$;
-- Saving the profile again without changing state still works (existing members are not locked out).
update public.app_settings set value = '["TX"]' where key = 'allowed_states';
update public.profiles set bio = 'still fine', state = 'CA' where id = '00000000-0000-0000-0000-0000000000a1';
update public.app_settings set value = '[]' where key = 'allowed_states';

-- No function declared stable (run read-only by PostgREST) may write: a stable
-- function that calls admin_log or inserts fails in the app with
-- "cannot execute INSERT in a read-only transaction" (PR #51).
do $$ declare r record; begin
  for r in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.provolatile = 's'
              and (p.prosrc ~* 'admin_log\(' or p.prosrc ~* '\minsert into' or p.prosrc ~* '\mupdate public\.' or p.prosrc ~* '\mdelete from') loop
    raise exception 'stable function % writes to the database', r.proname;
  end loop;
end $$;

rollback;
select 'LAUNCH RULES OK' as result;
