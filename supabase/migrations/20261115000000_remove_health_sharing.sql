-- =============================================================================
-- Migration 8: remove in-conversation health sharing (Seth's decision,
-- 2026-11-09: nothing is shared or sent inside the site). Safe to re-run.
-- Health self-report answers stay private to the member and admins only.
-- =============================================================================
drop policy if exists "Shared health" on public.health_self_reports;
drop table if exists public.health_shares;
