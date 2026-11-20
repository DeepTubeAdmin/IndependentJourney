-- =============================================================================
-- Migration 36: complete profile before messaging, BMI for new surrogates,
-- and no separate welcome email.
--
-- 1. Nobody can send a message until their own profile is complete. Before,
--    this applied to surrogates and agency client profiles only; an intended
--    parent with a membership could write with an empty profile.
-- 2. The "new message" email carries the sender's id so it can link to their
--    profile.
-- 3. BMI range becomes a required answer for surrogates who join from now on.
--    Surrogates who joined before this migration was first run are not
--    affected, so no live profile disappears. Agency client profiles (which
--    have no health section) are not affected either.
-- 4. The welcome email is folded into the "confirm your email" message, so it
--    is no longer sent to people who sign up with email and password. People
--    who join with Google or Apple never get a confirmation email, so they
--    still get the welcome.
-- Safe to run more than once.
-- =============================================================================

-- 1. Complete profile before messaging -------------------------------------
create or replace function public.can_message_as(p_from uuid, p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare me public.profiles; them public.profiles;
begin
  if auth.uid() is null then return 'sign_in'; end if;
  if not public.owns_or_manages(p_from) then return 'not_available'; end if;
  select * into me from public.profiles where id = p_from;
  select * into them from public.profiles where id = p_target;
  if me.id is null or them.id is null or me.id = them.id then return 'not_available'; end if;
  if me.role = them.role then return 'same_role'; end if;
  if not public.profile_is_live(them) then return 'not_available'; end if;
  if me.banned_at is not null or (me.suspended_until is not null and me.suspended_until > now()) then return 'account_restricted'; end if;
  if public.is_blocked_between(me.id, them.id) then return 'blocked'; end if;
  if me.managed_by is not null then
    if not me.is_complete then return 'profile_incomplete'; end if;
    if not public.agency_access(me.managed_by) then return 'agency_access_required'; end if;
    -- A member who chose "independent messages only" cannot be approached by an agency.
    if them.managed_by is null and them.journey_types = 'independent_only'
       and not exists (select 1 from public.conversations c where (c.surrogate_id = me.id and c.ip_id = them.id) or (c.ip_id = me.id and c.surrogate_id = them.id)) then
      return 'agency_messages_off';
    end if;
    return 'ok';
  end if;
  -- Everyone finishes their own profile before writing to anyone (migration 36).
  if not me.is_complete then return 'profile_incomplete'; end if;
  if me.role = 'intended_parent' and not public.has_active_membership(me.id) then return 'membership_required'; end if;
  return 'ok';
end $$;

-- 2. New-message email: include who sent it --------------------------------
create or replace function public.tg_email_new_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations; v_to public.profiles; v_sender public.profiles; v_locked boolean;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select * into v_to from public.profiles where id = case when new.sender_id = c.surrogate_id then c.ip_id else c.surrogate_id end;
  select * into v_sender from public.profiles where id = new.sender_id;
  v_locked := not public.member_access(v_to.id);
  perform public.enqueue_email(
    coalesce(v_to.managed_by, v_to.id),
    case when v_locked then 'locked_message' else 'new_message' end,
    jsonb_build_object('conversation_id', c.id, 'sender_id', v_sender.id, 'sender_name', v_sender.display_name, 'sender_state', v_sender.state,
                       'sender_verified', v_sender.is_verified,
                       'sender_agency', public.profile_agency_name(v_sender),
                       'for_name', case when v_to.managed_by is not null then v_to.display_name end,
                       'preview', case when v_locked then null else left(new.body, 140) end),
    'msg:' || c.id || ':' || to_char(now(), 'YYYY-MM-DD-HH24'));
  return new;
end $$;

-- 3. BMI required for new surrogates ----------------------------------------
-- Remembers the moment this was first run. Running the migration again keeps
-- the original moment.
insert into public.app_settings (key, value, description)
values ('bmi_required_from', to_jsonb(now()),
        'Surrogates who joined after this moment must answer the BMI question before their profile goes live. Set by migration 36; do not change.')
on conflict (key) do nothing;

create or replace function public.compute_profile_complete(p_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare v_role public.user_role; v_managed boolean; v_photos integer; v_ok boolean;
begin
  select role, managed_by is not null into v_role, v_managed from public.profiles where id = p_id;
  if v_role is null then return false; end if;
  select count(*) into v_photos from public.photos where profile_id = p_id;
  if v_photos < 3 then return false; end if;

  if v_role = 'surrogate' then
    select
      p.display_name <> '' and p.last_initial <> '' and p.state <> '' and p.bio <> ''
      and pp.date_of_birth is not null and pp.city <> '' and (v_managed or pp.phone <> '')
      and sd.willing_to_travel is not null and sd.us_resident is not null
      and sd.relationship_status <> '' and sd.has_health_insurance is not null
      and (sd.compensation_open or sd.compensation_min_usd is not null)
      and sd.open_to_twins is not null and sd.termination_comfort is not null
      and sd.relationship_level is not null and sd.carry_donor_embryos is not null
      and sd.earliest_start is not null
      and case when v_managed
            then sd.ob_cleared <> '' and sd.clinic_cleared <> ''
            else h.prior_births is not null and h.prior_pregnancies_uncomplicated is not null
                 and h.lifestyle_attestation is true and h.condition_affecting_pregnancy is not null
                 -- BMI is required for surrogates who joined after migration 36 was run.
                 and (h.bmi_range <> '' or p.created_at < coalesce(
                        (select (s.value #>> '{}')::timestamptz from public.app_settings s where s.key = 'bmi_required_from'), 'infinity'::timestamptz))
          end
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.surrogate_details sd on sd.id = p.id
    left join public.health_self_reports h on h.id = p.id
    where p.id = p_id;
  else
    select
      p.display_name <> '' and (p.state <> '' or p.country <> 'US') and p.bio <> ''   -- parents abroad have no US state
      and pp.city <> '' and (v_managed or pp.phone <> '')
      and ipd.family_structure <> '' and ipd.embryos_status is not null
      and ipd.open_to_twins is not null and ipd.desired_start is not null
      and ipd.relationship_level is not null and ipd.termination_comfort is not null
      and ipd.consulted_attorney is not null and ipd.budget_range <> ''
      and ipd.aware_of_birth_state_law is not null
      and exists (select 1 from public.ip_parents par where par.profile_id = p.id and par.first_name <> '' and par.age is not null)
    into v_ok
    from public.profiles p
    join public.profile_private pp on pp.id = p.id
    left join public.ip_details ipd on ipd.id = p.id
    where p.id = p_id;
  end if;
  return coalesce(v_ok, false);
end $$;

-- 4. Welcome email only for Google / Apple sign-ups -------------------------
create or replace function public.tg_email_welcome() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_provider text;
begin
  if new.managed_by is not null then return new; end if;
  select coalesce(to_jsonb(u) -> 'raw_app_meta_data' ->> 'provider', 'email') into v_provider from auth.users u where u.id = new.id;
  -- Email-and-password sign-ups are welcomed in their confirmation email.
  if coalesce(v_provider, 'email') <> 'email' then
    perform public.enqueue_email(new.id, 'welcome', jsonb_build_object('role', new.role), 'welcome:' || new.id);
  end if;
  return new;
end $$;
