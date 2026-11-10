-- =============================================================================
-- Migration 13: no length limit on the member's story ("Tell your story",
-- formerly "Short bio"). Members should be able to tell as much as they like.
-- Safe to run twice.
-- =============================================================================
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.profiles'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%char_length(bio)%' loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;
