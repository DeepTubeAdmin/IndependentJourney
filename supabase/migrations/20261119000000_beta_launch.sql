-- =============================================================================
-- Migration 12: beta launch offer.
--
-- While the site is in beta, new intended parents get a membership for free
-- (length set by beta_free_membership_months; 0 switches the offer off) and
-- visitors see a one-time welcome note (beta_banner_enabled). Both are
-- settings, so the offer ends with a click in Admin → Settings. Safe to run
-- twice.
-- =============================================================================

insert into public.app_settings (key, value, description) values
  ('beta_banner_enabled', 'true', 'Show the "we just launched" welcome note to new visitors (true/false)'),
  ('beta_free_membership_months', '3', 'Beta offer: months of free membership for each new intended parent. 0 = offer off')
on conflict (key) do nothing;

-- Grants the beta membership when an intended parent signs up.
create or replace function public.tg_beta_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_months integer := public.setting_int('beta_free_membership_months', 0);
begin
  if new.role = 'intended_parent' and v_months > 0 then
    insert into public.memberships (user_id, status, current_period_end, source)
    values (new.id, 'active', now() + make_interval(months => v_months), 'manual')
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists beta_membership on public.profiles;
create trigger beta_membership after insert on public.profiles for each row execute function public.tg_beta_membership();

-- Intended parents who joined before this migration and have no active
-- membership get the same offer, once.
insert into public.memberships (user_id, status, current_period_end, source)
select p.id, 'active', now() + make_interval(months => public.setting_int('beta_free_membership_months', 0)), 'manual'
  from public.profiles p
 where p.role = 'intended_parent' and p.banned_at is null
   and public.setting_int('beta_free_membership_months', 0) > 0
   and not exists (select 1 from public.memberships m where m.user_id = p.id and m.status = 'active' and m.current_period_end > now())
on conflict (user_id) do update
   set status = 'active', current_period_end = excluded.current_period_end, source = 'manual', updated_at = now()
 where public.memberships.status <> 'active' or public.memberships.current_period_end <= now();
