-- Migration 25: admin_agency_detail was declared "stable" but writes an audit
-- log row, so Supabase ran it in a read-only transaction and the admin page
-- failed with "cannot execute INSERT in a read-only transaction".
-- Same body as migration 23, without "stable". Safe to run more than once.

create or replace function public.admin_agency_detail(p_agency uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select to_jsonb(a) || jsonb_build_object(
           'email', (select u.email::text from auth.users u where u.id = a.id),
           'profiles', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'role', p.role, 'display_name', p.display_name, 'state', p.state, 'is_complete', p.is_complete, 'created_at', p.created_at) order by p.created_at desc)
                                   from public.profiles p where p.managed_by = a.id), '[]'::jsonb))
    into v from public.agencies a where a.id = p_agency;
  if v is null then raise exception 'Agency not found'; end if;
  perform public.admin_log('agency_viewed', p_agency);
  return v;
end $$;
revoke execute on function public.admin_agency_detail(uuid) from public, anon;
grant execute on function public.admin_agency_detail(uuid) to authenticated;
