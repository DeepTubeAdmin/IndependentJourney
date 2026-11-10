-- =============================================================================
-- Migration 10: Stripe payments (intended-parent membership) and Stripe
-- Identity (optional ID check for everyone).
--
-- How money flows: the website asks the "create-checkout" Edge Function for a
-- Stripe Checkout link. The member pays on Stripe's page. Stripe then calls
-- our "stripe-webhook" Edge Function, which calls apply_stripe_payment()
-- below with the service-role key. Nothing in the browser can grant itself a
-- membership. Safe to run twice.
-- =============================================================================

-- Memberships can now come from Stripe (web) as well as manual grants and,
-- later, RevenueCat (apps).
alter table public.memberships drop constraint if exists memberships_source_check;
alter table public.memberships add constraint memberships_source_check
  check (source in ('manual', 'revenuecat', 'stripe'));
alter table public.memberships add column if not exists stripe_customer_id text;
alter table public.memberships add column if not exists last_payment_id text;
alter table public.memberships add column if not exists started_at timestamptz not null default now();

-- Every Stripe event we acted on, keyed by Stripe's event id. Stripe retries
-- webhooks, so the same event can arrive twice; the primary key makes the
-- second delivery a no-op.
create table if not exists public.payment_events (
  id            text primary key,
  type          text not null,
  user_id       uuid references public.profiles (id) on delete set null,
  amount_cents  integer,
  created_at    timestamptz not null default now()
);
alter table public.payment_events enable row level security;
drop policy if exists "Admins read payment events" on public.payment_events;
create policy "Admins read payment events"
  on public.payment_events for select to authenticated
  using (public.is_admin());

-- One row per Stripe Identity session a member started.
create table if not exists public.identity_checks (
  id          text primary key,              -- Stripe VerificationSession id
  user_id     uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'created'
              check (status in ('created', 'processing', 'verified', 'requires_input', 'canceled')),
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists identity_checks_user_idx on public.identity_checks (user_id, created_at desc);
alter table public.identity_checks enable row level security;
drop policy if exists "Members read their own identity checks" on public.identity_checks;
create policy "Members read their own identity checks"
  on public.identity_checks for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- Functions the webhook calls. Only the service role may run them.
-- -----------------------------------------------------------------------------

-- Records a successful Checkout payment and starts or extends the membership.
-- If the member still has time left, the new term is added on top, so paying
-- early never loses days.
create or replace function public.apply_stripe_payment(
  p_event_id text, p_user uuid, p_payment_intent text, p_customer text, p_amount_cents integer
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_term integer := public.setting_int('membership_term_months', 3);
  v_from timestamptz;
  v_end  timestamptz;
begin
  insert into public.payment_events (id, type, user_id, amount_cents)
  values (p_event_id, 'checkout.session.completed', p_user, p_amount_cents)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_applied');
  end if;

  select case when m.status = 'active' and m.current_period_end > now() then m.current_period_end else now() end
    into v_from
    from public.memberships m where m.user_id = p_user;
  v_from := coalesce(v_from, now());
  v_end := v_from + make_interval(months => v_term);

  insert into public.memberships (user_id, status, current_period_end, source, stripe_customer_id, last_payment_id, started_at)
  values (p_user, 'active', v_end, 'stripe', p_customer, p_payment_intent, now())
  on conflict (user_id) do update
    set status = 'active', current_period_end = excluded.current_period_end, source = 'stripe',
        stripe_customer_id = coalesce(excluded.stripe_customer_id, public.memberships.stripe_customer_id),
        last_payment_id = excluded.last_payment_id, updated_at = now();

  return jsonb_build_object('status', 'applied', 'current_period_end', v_end);
end $$;

-- A refund in the Stripe dashboard ends the membership that payment bought.
create or replace function public.record_stripe_refund(p_event_id text, p_payment_intent text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid;
begin
  insert into public.payment_events (id, type) values (p_event_id, 'charge.refunded') on conflict (id) do nothing;
  if not found then return jsonb_build_object('status', 'already_applied'); end if;
  update public.memberships set status = 'cancelled', updated_at = now()
   where last_payment_id = p_payment_intent returning user_id into v_user;
  update public.payment_events set user_id = v_user where id = p_event_id;
  return jsonb_build_object('status', case when v_user is null then 'no_match' else 'cancelled' end);
end $$;

-- Called when a member starts an ID check, so we know the session is theirs.
create or replace function public.record_identity_check(p_user uuid, p_session_id text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.identity_checks (id, user_id) values (p_session_id, p_user) on conflict (id) do nothing;
$$;

-- Called from Stripe Identity webhooks. A verified result marks the profile
-- Verified; any other result just updates the row so the member sees why.
create or replace function public.apply_identity_result(p_event_id text, p_session_id text, p_status text, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid;
begin
  insert into public.payment_events (id, type) values (p_event_id, 'identity.' || p_status) on conflict (id) do nothing;
  if not found then return jsonb_build_object('status', 'already_applied'); end if;
  update public.identity_checks set status = p_status, last_error = p_error, updated_at = now()
   where id = p_session_id returning user_id into v_user;
  if v_user is null then return jsonb_build_object('status', 'unknown_session'); end if;
  update public.payment_events set user_id = v_user where id = p_event_id;
  if p_status = 'verified' then
    update public.profiles set is_verified = true, verified_at = now() where id = v_user;
  end if;
  return jsonb_build_object('status', p_status, 'user_id', v_user);
end $$;

-- Lock these down: browsers (anon/authenticated) can never call them.
revoke execute on function public.apply_stripe_payment(text, uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.record_stripe_refund(text, text) from public, anon, authenticated;
revoke execute on function public.record_identity_check(uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_identity_result(text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_stripe_payment(text, uuid, text, text, integer) to service_role;
grant execute on function public.record_stripe_refund(text, text) to service_role;
grant execute on function public.record_identity_check(uuid, text) to service_role;
grant execute on function public.apply_identity_result(text, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- What the member's own screens read.
-- -----------------------------------------------------------------------------

-- Membership status plus the current price and term, in one call.
-- status: 'none' (never paid), 'active', 'lapsed' (time ran out), 'cancelled'.
create or replace function public.my_membership()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'status', coalesce((select case when m.status = 'active' and m.current_period_end <= now() then 'lapsed' else m.status end
                          from public.memberships m where m.user_id = auth.uid()), 'none'),
    'active', public.has_active_membership(auth.uid()),
    'current_period_end', (select m.current_period_end from public.memberships m where m.user_id = auth.uid()),
    'source', (select m.source from public.memberships m where m.user_id = auth.uid()),
    'price_usd', public.setting_int('membership_price_usd', 199),
    'term_months', public.setting_int('membership_term_months', 3)
  );
$$;

-- The member's latest ID check, or null.
create or replace function public.my_identity_check()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select to_jsonb(c) from public.identity_checks c where c.user_id = auth.uid() order by c.created_at desc limit 1;
$$;

-- Admin member page: add membership, payments and ID checks.
create or replace function public.admin_member_detail(p_target uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'email', u.email,
    'private', (select to_jsonb(pp) from public.profile_private pp where pp.id = p.id),
    'surrogate', (select to_jsonb(sd) from public.surrogate_details sd where sd.id = p.id),
    'health', (select to_jsonb(h) from public.health_self_reports h where h.id = p.id),
    'ip', (select to_jsonb(ipd) from public.ip_details ipd where ipd.id = p.id),
    'parents', (select coalesce(jsonb_agg(to_jsonb(ipp) order by ipp.position), '[]'::jsonb) from public.ip_parents ipp where ipp.profile_id = p.id),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph) order by ph.position), '[]'::jsonb) from public.photos ph where ph.profile_id = p.id),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) order by c.agreed_at), '[]'::jsonb) from public.consents c where c.user_id = p.id),
    'flags', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb) from public.member_flags f where f.profile_id = p.id),
    'reports_against', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) from public.reports r where r.reported_id = p.id),
    'reports_filed', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) from public.reports r where r.reporter_id = p.id),
    'audit', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) from public.admin_audit_log a where a.target_id = p.id),
    'membership', (select to_jsonb(m) from public.memberships m where m.user_id = p.id),
    'payments', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb) from public.payment_events e where e.user_id = p.id),
    'identity_checks', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb) from public.identity_checks c where c.user_id = p.id)
  ) into v
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = p_target;
  if v is null then raise exception 'Member not found'; end if;
  return v;
end $$;

-- Dashboard counts: paying members and revenue this month.
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
    'flagged_messages_open', (select count(*) from public.messages where cardinality(scam_flags) > 0 and created_at > now() - interval '30 days'),
    'active_memberships', (select count(*) from public.memberships where status = 'active' and current_period_end > now()),
    'revenue_this_month_cents', (select coalesce(sum(amount_cents), 0) from public.payment_events
                                   where type = 'checkout.session.completed' and created_at >= date_trunc('month', now()))
  );
end $$;
