-- =============================================================================
-- Migration 16: Google and Apple sign-in.
--
-- Email sign-up sends the role and the attestations along with the account,
-- so handle_new_user() can build the profile straight away. A Google or Apple
-- sign-up cannot send anything, so for those the trigger now creates NOTHING
-- and the app shows a short "finish your account" step (pick a role, agree to
-- the terms) that calls complete_signup(). Until that runs, the login exists
-- but there is no profile, so the member cannot browse, message or be seen.
-- Safe to run twice.
-- =============================================================================

-- Shared by the trigger (email sign-up) and complete_signup() (social sign-up).
create or replace function public.create_profile_rows(
  p_user uuid, p_role public.user_role, p_individual boolean, p_age boolean, p_legal_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (p_user, p_role);
  insert into public.profile_private (id, attested_individual, attested_age) values (p_user, p_individual, p_age);
  insert into public.consents (user_id, document, version)
  select p_user, d, coalesce(p_legal_version, 'unknown')
  from unnest(array['terms', 'privacy', 'disclaimer', 'message_review']) as d;
  if p_role = 'surrogate' then
    insert into public.surrogate_details (id) values (p_user);
    insert into public.health_self_reports (id) values (p_user);
  else
    insert into public.ip_details (id) values (p_user);
  end if;
end $$;
revoke execute on function public.create_profile_rows(uuid, public.user_role, boolean, boolean, text) from public, anon, authenticated;

-- Email sign-up: metadata carries the role. Social sign-up: no role yet, so wait.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'role' in ('surrogate', 'intended_parent') then
    perform public.create_profile_rows(
      new.id,
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      coalesce((new.raw_user_meta_data ->> 'attested_individual')::boolean, false),
      coalesce((new.raw_user_meta_data ->> 'attested_age')::boolean, false),
      new.raw_user_meta_data ->> 'legal_version');
  end if;
  return new;
end $$;

-- Called once by the app after a Google or Apple sign-up, with the role the
-- member picked and the legal version they agreed to. Both attestations are
-- required in the UI before this can be called, so they are recorded as true.
create or replace function public.complete_signup(p_role public.user_role, p_legal_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = v_id) then
    raise exception 'This account is already set up.' using errcode = '23505';
  end if;
  perform public.create_profile_rows(v_id, p_role, true, true, p_legal_version);
end $$;
revoke execute on function public.complete_signup(public.user_role, text) from public, anon;
grant execute on function public.complete_signup(public.user_role, text) to authenticated;
