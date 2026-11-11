-- =============================================================================
-- Migration 18: account deletion no longer deletes photo files with SQL.
--
-- Supabase now blocks direct deletes on its storage tables ("Direct deletion
-- from storage tables is not allowed. Use the Storage API instead."), which
-- made "Delete my account" fail. The website already removes the member's
-- photo files through the Storage API just before calling this function, so
-- the SQL delete is only a safety net now: it is attempted, and skipped
-- quietly where Supabase forbids it. Everything else is unchanged.
-- Safe to run twice.
-- =============================================================================

create or replace function public.delete_my_account(p_reason text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := auth.uid(); v_role public.user_role; v_joined timestamptz;
begin
  if v_id is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_roles where user_id = v_id) then
    raise exception 'Admin accounts cannot be deleted from Settings. Ask another admin to remove your admin role first.' using errcode = '42501';
  end if;
  select role, created_at into v_role, v_joined from public.profiles where id = v_id;
  if v_role is not null then
    insert into public.deleted_accounts (role, joined_at, reason) values (v_role, v_joined, left(coalesce(p_reason, ''), 500));
  end if;

  -- Conversations and messages (messages keep a plain reference to the sender,
  -- so they are removed explicitly before the profile goes).
  delete from public.messages where sender_id = v_id
     or conversation_id in (select id from public.conversations where surrogate_id = v_id or ip_id = v_id);
  delete from public.conversations where surrogate_id = v_id or ip_id = v_id or started_by = v_id;

  -- Photo files: the app removes them through the Storage API first. This is
  -- only a fallback, skipped where Supabase forbids SQL deletes on storage.
  begin
    delete from storage.objects where bucket_id = 'profile-photos' and name like v_id::text || '/%';
  exception when others then
    null;
  end;

  -- The login itself; every profile table cascades from it.
  delete from auth.users where id = v_id;
end $$;
revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
