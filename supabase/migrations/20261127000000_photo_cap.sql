-- =============================================================================
-- Migration 20: at most 6 photos per profile, enforced in the database.
--
-- The app already stops at 6 and needs 3 for a complete profile (migration 1),
-- but only the app enforced the top end. This trigger makes the database say
-- no as well, so nothing can slip past the limit. Safe to run twice.
-- =============================================================================

create or replace function public.photos_enforce_cap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.photos where profile_id = new.profile_id) >= 6 then
    raise exception 'A profile can have at most 6 photos. Remove one before adding another.' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists photos_cap on public.photos;
create trigger photos_cap before insert on public.photos
  for each row execute function public.photos_enforce_cap();
