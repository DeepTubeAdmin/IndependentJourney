-- =============================================================================
-- Beta offer tests: new intended parents get a free membership while the
-- setting is above zero.
-- =============================================================================
begin;

do $$
declare ip1 uuid := '00000000-0000-0000-0000-000000000091'; ip2 uuid := '00000000-0000-0000-0000-000000000092';
        sur uuid := '00000000-0000-0000-0000-000000000093';
begin
  update public.app_settings set value = '3' where key = 'beta_free_membership_months';
  insert into auth.users (id, email, raw_user_meta_data) values
    (ip1, 'betaip1@test', '{"role":"intended_parent"}'), (sur, 'betasur@test', '{"role":"surrogate"}');
  assert public.has_active_membership(ip1), 'new intended parent should get the beta membership';
  assert (select current_period_end between now() + interval '89 days' and now() + interval '93 days' from public.memberships where user_id = ip1), 'beta term should follow the setting';
  assert not exists (select 1 from public.memberships where user_id = sur), 'surrogates need no membership';

  update public.app_settings set value = '0' where key = 'beta_free_membership_months';
  insert into auth.users (id, email, raw_user_meta_data) values (ip2, 'betaip2@test', '{"role":"intended_parent"}');
  assert not public.has_active_membership(ip2), 'offer off: no free membership';
end $$;

rollback;
select 'BETA RULES OK' as result;
