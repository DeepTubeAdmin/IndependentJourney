-- =============================================================================
-- Migration 14: self-service account deletion (Phase 9).
--
-- A member can delete their own account from Settings. Everything tied to the
-- profile goes with it (answers, photos, saved profiles, conversations,
-- memberships, email preferences). We keep only an anonymous line in
-- deleted_accounts so admin counts stay honest. Admins cannot delete
-- themselves here (their audit-log rows must survive). Safe to run twice.
-- =============================================================================

create table if not exists public.deleted_accounts (
  id          bigint generated always as identity primary key,
  role        public.user_role not null,
  joined_at   timestamptz not null,
  deleted_at  timestamptz not null default now(),
  reason      text not null default ''
);
alter table public.deleted_accounts enable row level security;
drop policy if exists "Admins read deleted accounts" on public.deleted_accounts;
create policy "Admins read deleted accounts" on public.deleted_accounts for select to authenticated using (public.is_admin());

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

  -- Photo files in the private bucket.
  delete from storage.objects where bucket_id = 'profile-photos' and name like v_id::text || '/%';

  -- The login itself; every profile table cascades from it.
  delete from auth.users where id = v_id;
end $$;
revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

-- Admin overview: how many accounts were deleted in the last 30 days.
create or replace function public.admin_deleted_count_30d()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.deleted_accounts where deleted_at > now() - interval '30 days';
$$;
