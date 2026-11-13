-- Migration 24: three embryo questions (Seth, 2026-11-13).
-- Safe to run more than once (every statement is "if not exists").
--
-- Surrogates (public, shown on the profile):
--   untested_embryos_ok   yes / no / not_sure   Willing to use embryos that have not been genetically tested?
-- Intended parents (public):
--   embryos_tested        yes / no / discuss    Embryos are genetically tested?
--   embryo_transfer_ok    yes / no / not_sure   Willing to transfer embryos to a different location?

alter table public.surrogate_details
  add column if not exists untested_embryos_ok text not null default ''
    check (untested_embryos_ok in ('', 'yes', 'no', 'not_sure'));

alter table public.ip_details
  add column if not exists embryos_tested text not null default ''
    check (embryos_tested in ('', 'yes', 'no', 'discuss')),
  add column if not exists embryo_transfer_ok text not null default ''
    check (embryo_transfer_ok in ('', 'yes', 'no', 'not_sure'));

comment on column public.surrogate_details.untested_embryos_ok is 'Willing to use embryos that have not been genetically tested.';
comment on column public.ip_details.embryos_tested is 'Embryos are genetically tested (yes / no / will discuss).';
comment on column public.ip_details.embryo_transfer_ok is 'Willing to transfer embryos to a different location (clinic).';
