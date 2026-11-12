-- =============================================================================
-- Agency account tests (migration 23).
-- =============================================================================
begin;

-- The admin exists first, so the agency sign-up emails reach someone.
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000da', 'admin@test', '{"role":"intended_parent"}');
insert into public.admin_roles (user_id) values ('00000000-0000-0000-0000-0000000000da');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'agency1@test', '{"role":"agency","agency_name":"Bright Beginnings","agency_website":"https://bright.example","contact_name":"Dana"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'agency2@test', '{"role":"agency","agency_name":"Other Agency","agency_website":"https://other.example","contact_name":"Lee"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'ip@test',      '{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'ip-quiet@test','{"role":"intended_parent"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'gc@test',      '{"role":"surrogate"}');
-- run.sh switches the beta offer off, so give both intended parents a membership by hand.
insert into public.memberships (user_id, status, current_period_end, source) values
  ('00000000-0000-0000-0000-0000000000d1', 'active', now() + interval '90 days', 'manual'),
  ('00000000-0000-0000-0000-0000000000d2', 'active', now() + interval '90 days', 'manual')
on conflict (user_id) do update set status = 'active', current_period_end = now() + interval '90 days';

create or replace function pg_temp.login(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  -- aal2 = two-factor passed, so the admin calls work for the admin user.
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
end $$;

-- Complete members quickly.
create or replace function pg_temp.complete_ip(uid uuid, nm text) returns void language plpgsql as $$
begin
  update public.profiles set display_name=nm, state='CO', bio='Hi' where id=uid;
  update public.profile_private set city='Denver', phone='3035551234' where id=uid;
  update public.ip_details set family_structure='couple', embryos_status='created', open_to_twins='comfortable', desired_start='2027-01-01',
    relationship_level='close', termination_comfort='comfortable', consulted_attorney=true, budget_range='150_200k', aware_of_birth_state_law=true where id=uid;
  insert into public.ip_parents (profile_id, position, first_name, age) values (uid, 1, nm, 38);
  insert into public.photos (profile_id, storage_path, position) values (uid, uid::text||'/a.jpg', 0), (uid, uid::text||'/b.jpg', 1), (uid, uid::text||'/c.jpg', 2);
end $$;
select pg_temp.complete_ip('00000000-0000-0000-0000-0000000000d1', 'Daniel');
select pg_temp.complete_ip('00000000-0000-0000-0000-0000000000d2', 'Quiet Quinn');
update public.profiles set journey_types = 'independent_only' where id = '00000000-0000-0000-0000-0000000000d2';
update public.profiles set display_name='Indy Ivy', last_initial='R', state='TX', bio='Hello', profile_type='with_agency', agency_name='Some Agency' where id='00000000-0000-0000-0000-0000000000d3';

-- 1. Sign-up created a pending agency, no profile, and an admin email.
do $$ begin
  assert (select status from public.agencies where id = '00000000-0000-0000-0000-0000000000c1') = 'pending', 'agency starts pending';
  assert (select name from public.agencies where id = '00000000-0000-0000-0000-0000000000c1') = 'Bright Beginnings', 'name from sign-up metadata';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'an agency has no profile row';
  assert exists (select 1 from public.email_outbox where template = 'agency_pending' and user_id = '00000000-0000-0000-0000-0000000000da'), 'admin is emailed about the pending agency';
  assert exists (select 1 from public.email_outbox where template = 'agency_welcome' and user_id = '00000000-0000-0000-0000-0000000000c1'), 'agency gets a welcome email';
end $$;

-- 2. Pending agency: can see itself, cannot add clients, cannot read members' full details.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  assert (select count(*) from public.agencies) = 1, 'agency sees only itself';
  begin
    perform public.agency_create_profile('surrogate');
    raise exception 'pending agency created a profile';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000d1') = 0, 'pending agency cannot read member profiles';
  assert (select public.my_agency() ->> 'status') = 'pending', 'my_agency works while pending';
end $$;

-- Fill in the agency details (owner update; status stays as it is).
update public.agencies set hq_state='CA', states_served='{CA,TX}', services='{matching,screening}', ip_fee_range='30_40k', surrogate_comp_range='40_55k',
  description='We have placed many families.', attested_consent=true where id = auth.uid();
do $$ begin
  assert (select is_complete from public.agencies where id = auth.uid()), 'details complete';
  begin
    update public.agencies set status = 'approved' where id = auth.uid();
    raise exception 'agency approved itself';
  exception when others then null; end;
end $$;
reset role;
do $$ begin
  assert (select status from public.agencies where id = '00000000-0000-0000-0000-0000000000c1') = 'pending', 'self-approval was rejected';
  assert exists (select 1 from public.email_outbox where template = 'agency_ready' and user_id = '00000000-0000-0000-0000-0000000000da'), 'admin is told the details are ready to review';
end $$;

-- 3. Admin approves. Agency is emailed.
select pg_temp.login('00000000-0000-0000-0000-0000000000da');
select public.admin_set_agency_status('00000000-0000-0000-0000-0000000000c1', 'approved', 'Looks good');
do $$ begin
  assert (select count(*) from public.admin_list_agencies('approved')) = 1, 'admin list shows the approved agency';
  assert (select (public.admin_overview() ->> 'agencies_pending')::int) = 1, 'one agency (the other) still pending';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from public.email_outbox where template = 'agency_approved' and user_id = '00000000-0000-0000-0000-0000000000c1'), 'agency emailed on approval';
end $$;

-- 4. Approved agency adds a surrogate client and fills her in (no phone, no health step).
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
create temp table t_client as select public.agency_create_profile('surrogate') as id;
do $$ declare cid uuid := (select id from t_client); begin
  assert (select managed_by from public.profiles where id = cid) = '00000000-0000-0000-0000-0000000000c1', 'client managed by the agency';
  assert (select profile_type from public.profiles where id = cid) = 'agency', 'client labelled agency';
  update public.profiles set display_name='Megan', last_initial='R', state='TX', bio='Client story' where id = cid;
  update public.profile_private set first_name='Megan', last_name='Rose', date_of_birth='1994-01-01', city='Austin' where id = cid;
  update public.surrogate_details set willing_to_travel='yes', us_resident=true, relationship_status='married', has_health_insurance='yes',
    compensation_open=true, open_to_twins='comfortable', termination_comfort='comfortable', relationship_level='regular_updates',
    carry_donor_embryos='yes', earliest_start='2027-03-01' where id = cid;
  insert into public.photos (profile_id, storage_path, position) values (cid, cid::text||'/a.jpg', 0), (cid, cid::text||'/b.jpg', 1), (cid, cid::text||'/c.jpg', 2);
  assert not (select is_complete from public.profiles where id = cid), 'not complete until medical clearance is answered';
  update public.surrogate_details set ob_cleared='yes', clinic_cleared='in_progress', clearance_clinic='CCRM' where id = cid;
  assert (select is_complete from public.profiles where id = cid), 'complete without phone or health answers once clearance is answered';
  assert (select count(*) from public.health_self_reports where id = cid) = 0, 'agency cannot read the (empty) health row';
  begin
    update public.profiles set managed_by = null where id = cid;
    raise exception 'agency detached the profile';
  exception when others then null; end;
  -- Agency sees full member profiles (free beta access).
  assert (select count(*) from public.ip_details where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'agency reads full IP details';
  assert public.my_access_to('00000000-0000-0000-0000-0000000000d1') = 'full', 'agency has full access to members';
end $$;

-- Storage: the agency may write into the client folder, not into a stranger's.
do $$ declare cid uuid := (select id from t_client); begin
  insert into storage.objects (bucket_id, name) values ('profile-photos', cid::text || '/x.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('profile-photos', '00000000-0000-0000-0000-0000000000d3/x.jpg');
    raise exception 'agency wrote into a member folder';
  exception when others then null; end;
end $$;

-- 5. The other agency cannot touch the client.
select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
do $$ declare cid uuid := (select id from t_client); begin
  assert (select count(*) from public.profile_private where id = cid) = 0, 'other agency cannot read client private data';
  update public.profiles set bio = 'hacked' where id = cid;
  assert (select count(*) from public.profiles where id = cid and bio = 'hacked') = 0, 'other agency cannot edit the client';
end $$;

-- 6. Browse shows labels; the Independent filter hides agency profiles; members see agency profiles.
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
do $$ declare cid uuid := (select id from t_client); r record; begin
  select * into r from public.browse_profiles('{}') where id = cid;
  assert r.profile_type = 'agency' and r.agency_name = 'Bright Beginnings', 'browse row carries the agency label';
  assert (select count(*) from public.browse_profiles('{"profile_type":"independent"}') where id = cid) = 0, 'independent filter hides agency profiles';
  assert (select count(*) from public.browse_profiles('{"profile_type":"agency"}')) = 1, 'agency filter shows only agency profiles';
  select * into r from public.browse_profiles('{}') where id = '00000000-0000-0000-0000-0000000000d3';
  assert r.id is null, 'incomplete independent surrogate is not listed (sanity)';
  assert public.my_access_to(cid) = 'full', 'member IP with membership sees the agency surrogate in full';
end $$;

-- 7. Messaging. Agency messages Daniel as Megan; cannot approach Quinn (independent only).
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ declare cid uuid := (select id from t_client); res jsonb; begin
  assert public.can_message_as(cid, '00000000-0000-0000-0000-0000000000d1') = 'ok', 'agency may message a member who allows agencies';
  assert public.can_message_as(cid, '00000000-0000-0000-0000-0000000000d2') = 'agency_messages_off', 'member who chose independent-only is off limits';
  assert public.can_message_as('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1') = 'not_available', 'cannot send as a profile you do not manage';
  res := public.send_message_as(cid, '00000000-0000-0000-0000-0000000000d1', 'Hello from Megan via her agency');
  assert res ->> 'status' = 'delivered', 'message delivered';
  assert (select sent_by from public.messages where id = (res ->> 'message_id')::bigint) = '00000000-0000-0000-0000-0000000000c1', 'sent_by records the agency login';
  assert (select count(*) from public.my_conversations() where mine_id = cid and other_id = '00000000-0000-0000-0000-0000000000d1') = 1, 'agency inbox lists the conversation under the client';
  assert (select count(*) from public.my_conversations()) = 1, 'agency inbox has exactly one conversation';
end $$;

-- 7b. An agency can save profiles and set email preferences like any member.
insert into public.saved_profiles (user_id, profile_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000d1');
select public.set_notification_settings('{"new_messages": false}'::jsonb);
do $$ begin
  assert (select count(*) from public.saved_profiles where user_id = auth.uid()) = 1, 'agency saved a profile';
  assert (public.my_notification_settings() ->> 'new_messages')::boolean = false, 'agency turned message emails off';
end $$;
select public.set_notification_settings('{"new_messages": true}'::jsonb);
reset role;
do $$ begin
  assert exists (select 1 from public.email_outbox where template = 'new_message' and user_id = '00000000-0000-0000-0000-0000000000d1' and payload ->> 'sender_agency' = 'Bright Beginnings'), 'recipient email names the agency';
end $$;

-- Quinn (independent only) writes to Megan first; then the agency may reply.
select pg_temp.login('00000000-0000-0000-0000-0000000000d2');
do $$ declare cid uuid := (select id from t_client); res jsonb; begin
  assert (select count(*) from public.browse_profiles('{}') where id = cid) = 0, 'independent-only member does not see agency profiles in browse';
  assert (select count(*) from public.browse_profiles('{"profile_type":"agency"}')) = 0, 'not even with the agency filter';
  assert (select count(*) from public.featured_profiles(12) where id = cid) = 0, 'nor on the homepage';
  assert public.can_message(cid) = 'ok', 'a member may always write to an agency profile';
  res := public.send_message(cid, 'Hi Megan, tell me more');
  assert res ->> 'status' = 'delivered', 'delivered to the agency-managed profile';
end $$;
reset role;
do $$ declare cid uuid := (select id from t_client); begin
  assert exists (select 1 from public.email_outbox where template = 'new_message' and user_id = '00000000-0000-0000-0000-0000000000c1' and payload ->> 'for_name' = 'Megan'), 'the agency login gets the email, naming the client';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ declare cid uuid := (select id from t_client); begin
  assert public.can_message_as(cid, '00000000-0000-0000-0000-0000000000d2') = 'ok', 'agency may reply once the member wrote first';
  assert public.my_unread_count() = 1, 'one unread for the agency';
  perform public.mark_conversation_read((select conversation_id from public.my_conversations() where other_id = '00000000-0000-0000-0000-0000000000d2'));
  assert public.my_unread_count() = 0, 'marked read';
  assert (select count(*) from public.messages) = 2, 'agency reads both messages';
end $$;

-- 8. Suspending the agency hides its clients; approving again restores them.
select pg_temp.login('00000000-0000-0000-0000-0000000000da');
select public.admin_set_agency_status('00000000-0000-0000-0000-0000000000c1', 'suspended', 'Checking something');
reset role;
do $$ declare cid uuid := (select id from t_client); begin
  assert not public.profile_is_live((select p from public.profiles p where p.id = cid)), 'client hidden while agency suspended';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000da');
select public.admin_set_agency_status('00000000-0000-0000-0000-0000000000c1', 'approved', '');
reset role;
do $$ declare cid uuid := (select id from t_client); begin
  assert public.profile_is_live((select p from public.profiles p where p.id = cid)), 'client live again';
end $$;

-- 9. Removing: the agency deletes the client; deleting the agency account removes everything.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
create temp table t_client2 as select public.agency_create_profile('intended_parent') as id;
select public.agency_delete_profile((select id from t_client2));
do $$ begin
  assert not exists (select 1 from public.profiles where id = (select id from t_client2)), 'client profile removed';
end $$;
select public.delete_my_account('closing');
reset role;
do $$ declare cid uuid := (select id from t_client); begin
  assert not exists (select 1 from public.agencies where id = '00000000-0000-0000-0000-0000000000c1'), 'agency gone';
  assert not exists (select 1 from public.profiles where id = cid), 'managed profile gone with the agency';
  assert not exists (select 1 from public.messages where sender_id = cid), 'its messages gone';
  assert exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'members untouched';
end $$;

-- 10. Independent member deletion still works with the auth FK gone.
select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select public.delete_my_account('bye');
reset role;
do $$ begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d3'), 'member profile removed on account deletion';
end $$;

select 'AGENCY RULES OK' as result;
rollback;
