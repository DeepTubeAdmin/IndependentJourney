-- Migration 9: fix the admin "Members" list.
--
-- Supabase stores auth.users.email as varchar(255), but admin_search_members
-- declared it as text, so Postgres refused with "structure of query does not
-- match function result type". Casting the column fixes it. Safe to run twice.

create or replace function public.admin_search_members(p_query text default '', p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, role public.user_role, display_name text, last_initial text, state text,
  email text, is_complete boolean, is_verified boolean, banned_at timestamptz, suspended_until timestamptz,
  created_at timestamptz, open_flags bigint, open_reports bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, p.role, p.display_name, p.last_initial, p.state,
         u.email::text, p.is_complete, p.is_verified, p.banned_at, p.suspended_until, p.created_at,
         (select count(*) from public.member_flags f where f.profile_id = p.id and f.cleared_at is null),
         (select count(*) from public.reports r where r.reported_id = p.id and r.status in ('open', 'reviewing'))
    from public.profiles p
    join auth.users u on u.id = p.id
   where p_query = ''
      or p.display_name ilike '%' || p_query || '%'
      or u.email ilike '%' || p_query || '%'
      or p.state ilike p_query
      or p.id::text = p_query
   order by p.created_at desc           -- newest accounts first
   limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;
