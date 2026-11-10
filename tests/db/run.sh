#!/usr/bin/env bash
# Applies every migration to a fresh local database and runs the access-rule
# tests. Needs a local Postgres reachable via the PG* environment variables
# (or PGHOST/PGPORT below). Not needed by Netlify or the app itself.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-ij_test}
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f tests/db/supabase_stubs.sql
for f in supabase/migrations/*.sql; do psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f"; done
# The older suites assume intended parents start without a membership, so the
# beta offer is switched off here; beta_rules.sql turns it on for itself.
psql -q -d "$DB" -v ON_ERROR_STOP=1 -c "update public.app_settings set value = '0' where key = 'beta_free_membership_months'"
for t in tests/db/*_rules.sql; do psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$t"; done
