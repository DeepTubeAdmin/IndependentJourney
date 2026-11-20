-- =============================================================================
-- Migration 34: agencies are approved automatically.
--
-- Before: a new agency waited in "pending" until an admin approved it by hand.
-- Now: an agency account is active from the moment it signs up, the same as a
-- surrogate or intended-parent account. It still has to finish its agency
-- details before it can post client profiles.
--
-- What stays: the Agencies section in the admin dashboard, and the ability to
-- suspend an agency (which hides all of its client profiles) and reinstate it.
--
-- Agencies that were waiting for approval when this runs are approved and
-- emailed. Agencies that were rejected or suspended are left as they are.
-- Safe to run more than once.
-- =============================================================================

-- New agencies start out active.
alter table public.agencies alter column status set default 'approved';

-- Emails. Admins get one "a new agency joined" note when the agency finishes
-- its details (no action needed). The agency is told if it is suspended or
-- reinstated.
create or replace function public.tg_agency_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_email(new.id, 'agency_welcome', jsonb_build_object('agency_name', new.name), 'agency_welcome:' || new.id);
  elsif new.is_complete and not old.is_complete then
    for r in select user_id from public.admin_roles loop
      perform public.enqueue_email(r.user_id, 'agency_ready', jsonb_build_object('agency_id', new.id, 'agency_name', new.name, 'website', new.website, 'contact_name', new.contact_name), 'agency_ready:' || new.id || ':' || r.user_id);
    end loop;
  elsif new.status <> old.status and new.status in ('approved', 'suspended') then
    perform public.enqueue_email(new.id, 'agency_' || new.status, jsonb_build_object('agency_name', new.name, 'note', new.review_note), 'agency_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;

-- Anyone still waiting is approved now (this sends them the "active" email).
update public.agencies set status = 'approved', reviewed_at = now() where status = 'pending';
