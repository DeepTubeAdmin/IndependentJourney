-- =============================================================================
-- Migration 40: member counts for the public state pages
--   (independentjourney.com/surrogacy/texas and so on).
--
-- Adds one small function that answers "how many surrogates and how many
-- intended parents with a live profile are in this state?". It returns two
-- numbers only, never names or any other profile detail, so it is safe for
-- visitors who are not signed in. It counts the same profiles that already
-- appear in Browse (complete, not banned, not suspended).
-- Safe to run more than once.
-- =============================================================================

create or replace function public.state_member_counts(p_state text)
returns table (surrogates integer, intended_parents integer)
language sql stable security definer set search_path = ''
as $$
  select
    count(*) filter (where p.role = 'surrogate')::integer,
    count(*) filter (where p.role = 'intended_parent')::integer
  from public.profiles p
  where public.profile_is_live(p)
    and p.state = upper(trim(p_state))
    and length(trim(p_state)) = 2;
$$;

revoke execute on function public.state_member_counts(text) from public;
grant execute on function public.state_member_counts(text) to anon, authenticated;
