-- Migration 29: surrogate question "Open to international intended parents?"
-- (Seth, 2026-11-17). Safe to run more than once.
--
-- Public answer, shown on the profile like the rest of surrogate_details:
--   international_ips_ok   yes / no / not_sure
--
-- Until now this was only a checkbox ("Parents living abroad") inside the
-- "Open to working with" list. It becomes its own question; anyone who had
-- ticked the checkbox is carried over as "yes" and the checkbox goes away.

alter table public.surrogate_details
  add column if not exists international_ips_ok text not null default ''
    check (international_ips_ok in ('', 'yes', 'no', 'not_sure'));

comment on column public.surrogate_details.international_ips_ok is 'Open to working with intended parents who live outside the US.';

-- Carry over the old checkbox, then drop it from the list (re-runnable: the
-- second run finds nothing to move).
update public.surrogate_details
   set international_ips_ok = 'yes'
 where 'international' = any(open_to_ip_types) and international_ips_ok = '';

update public.surrogate_details
   set open_to_ip_types = array_remove(open_to_ip_types, 'international')
 where 'international' = any(open_to_ip_types);
