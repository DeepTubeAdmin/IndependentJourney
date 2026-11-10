-- =============================================================================
-- Payments and identity-check tests (Phase 7).
-- =============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000071', 'payip@test', '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-000000000072', 'paysur@test', '{"role":"surrogate"}');

create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create or replace function pg_temp.server() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function pg_temp.admin_mode() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;

do $$
declare ip text := '00000000-0000-0000-0000-000000000071'; sur text := '00000000-0000-0000-0000-000000000072'; r jsonb;
begin
  -- Browsers cannot call the webhook functions.
  perform pg_temp.login(ip);
  begin
    perform public.apply_stripe_payment('evt_hack', ip::uuid, 'pi_x', 'cus_x', 19900);
    raise exception 'authenticated could grant itself a membership';
  exception when insufficient_privilege then null; end;
  assert (public.my_membership() ->> 'status') = 'none', 'fresh IP should have status none';
  assert (public.my_membership() ->> 'price_usd') = '199', 'price should come from settings';

  -- The server applies a payment: 3 months from now. Duplicate events are ignored.
  perform pg_temp.server();
  assert (public.apply_stripe_payment('evt_1', ip::uuid, 'pi_1', 'cus_1', 19900) ->> 'status') = 'applied', 'first payment should apply';
  assert (public.apply_stripe_payment('evt_1', ip::uuid, 'pi_1', 'cus_1', 19900) ->> 'status') = 'already_applied', 'duplicate event should be ignored';
  perform pg_temp.admin_mode();
  assert public.has_active_membership(ip::uuid), 'membership should be active';
  assert (select current_period_end between now() + interval '89 days' and now() + interval '93 days' from public.memberships where user_id = ip::uuid), 'term should be about 3 months';

  -- Paying again before it ends adds a second term on top.
  perform pg_temp.server();
  perform public.apply_stripe_payment('evt_2', ip::uuid, 'pi_2', 'cus_1', 19900);
  perform pg_temp.admin_mode();
  assert (select current_period_end > now() + interval '170 days' from public.memberships where user_id = ip::uuid), 'second payment should extend, not restart';

  -- The member sees it.
  perform pg_temp.login(ip);
  assert (public.my_membership() ->> 'status') = 'active', 'member should see active';

  -- A refund of the latest payment cancels it.
  perform pg_temp.server();
  assert (public.record_stripe_refund('evt_3', 'pi_2') ->> 'status') = 'cancelled', 'refund should cancel';
  perform pg_temp.admin_mode();
  assert not public.has_active_membership(ip::uuid), 'refunded membership should not be active';

  -- Identity: only a verified result marks the member verified.
  perform pg_temp.server();
  perform public.record_identity_check(sur::uuid, 'vs_1');
  perform public.apply_identity_result('evt_4', 'vs_1', 'requires_input', 'document_unverified_other');
  perform pg_temp.admin_mode();
  assert not (select is_verified from public.profiles where id = sur::uuid), 'requires_input must not verify';
  perform pg_temp.server();
  perform public.apply_identity_result('evt_5', 'vs_1', 'verified', null);
  assert (public.apply_identity_result('evt_6', 'vs_unknown', 'verified', null) ->> 'status') = 'unknown_session', 'unknown session should be ignored';
  perform pg_temp.admin_mode();
  assert (select is_verified from public.profiles where id = sur::uuid), 'verified result should verify';

  -- Members see their own check and nobody else's.
  perform pg_temp.login(sur);
  assert (public.my_identity_check() ->> 'status') = 'verified', 'member should see own check';
  perform pg_temp.login(ip);
  assert (select count(*) from public.identity_checks) = 0, 'other members must not see identity checks';
  perform pg_temp.admin_mode();
end $$;

select ' PAYMENTS RULES OK' as result;
rollback;
