-- =============================================================================
-- Migration 21: signed-in members can see preview photos of every live
-- profile, including their own side.
--
-- Since migration 19 the homepage shows both surrogates and intended parents
-- to everyone, but the photo rule still let a signed-in member see only the
-- opposite role's files, so same-role cards came up blank for members while
-- visitors saw them fine. Previews are public now, so a member may see at
-- least what a visitor sees. Full profiles are unchanged. Safe to run twice.
-- =============================================================================

create or replace function public.photo_is_previewable(p_object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(p_object_name))[1]
      and (
        public.profile_is_live(p)                                  -- anyone: live profiles
        or (auth.uid() is not null and public.can_preview(p))      -- plus yourself / admin
      )
  );
$$;
revoke execute on function public.photo_is_previewable(text) from public;
grant execute on function public.photo_is_previewable(text) to anon, authenticated;
