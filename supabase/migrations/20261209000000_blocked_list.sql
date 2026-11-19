-- Migration 32: "Blocked members" list in Settings.
--
-- Members could already block and unblock from a profile or a conversation.
-- This adds one read-only function so Settings can show everyone you have
-- blocked in one place, with their name, and unblock them from there.
-- (Apple and Google both expect blocking to be easy to find and to undo.)
--
-- Safe to run more than once.

create or replace function public.my_blocked_members()
returns table (blocker_id uuid, blocked_id uuid, display_name text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  -- Only your own blocks (or, for an agency, blocks made for a client profile
  -- you manage). Shows the name only: nothing else about the blocked member.
  select b.blocker_id,
         b.blocked_id,
         coalesce(nullif(trim(p.display_name), ''), 'Member')::text,
         b.created_at
    from public.blocks b
    join public.profiles p on p.id = b.blocked_id
   where public.owns_or_manages(b.blocker_id)
   order by b.created_at desc;
$$;

revoke all on function public.my_blocked_members() from public, anon;
grant execute on function public.my_blocked_members() to authenticated;
