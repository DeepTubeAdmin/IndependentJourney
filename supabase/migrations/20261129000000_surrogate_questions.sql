-- Migration 22: six more surrogate questionnaire answers.
-- Safe to run more than once (every statement is "if not exists" or a replace).
--
-- Public answers (shown on the profile, like the rest of surrogate_details):
--   cycle_preference         medicated / natural / either
--   journeys_completed       how many surrogate journeys so far
--   background_check         yes / no / discuss_later
-- Private answers (health self-report, visible to the member and admins only):
--   vaccines_in_pregnancy    yes / no / discuss_later
--   c_sections               how many c-sections
--   ob_clearance             yes / no / discuss_later

alter table public.surrogate_details
  add column if not exists cycle_preference text not null default ''
    check (cycle_preference in ('', 'medicated', 'natural', 'either')),
  add column if not exists journeys_completed integer
    check (journeys_completed is null or journeys_completed between 0 and 20),
  add column if not exists background_check public.yes_no_discuss;

alter table public.health_self_reports
  add column if not exists vaccines_in_pregnancy public.yes_no_discuss,
  add column if not exists c_sections integer
    check (c_sections is null or c_sections between 0 and 10),
  add column if not exists ob_clearance public.yes_no_discuss;

comment on column public.surrogate_details.cycle_preference is 'Preferred transfer cycle: medicated, natural, or either.';
comment on column public.surrogate_details.journeys_completed is 'Surrogate journeys completed before this one.';
comment on column public.surrogate_details.background_check is 'Able to pass a background check (self-reported).';
comment on column public.health_self_reports.vaccines_in_pregnancy is 'Open to recommended vaccines during pregnancy (self-reported).';
comment on column public.health_self_reports.c_sections is 'Number of c-sections (self-reported).';
comment on column public.health_self_reports.ob_clearance is 'Current clearance from an OB for surrogacy (self-reported).';
