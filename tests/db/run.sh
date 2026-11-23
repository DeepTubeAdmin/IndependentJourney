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
# Likewise the older suites build surrogates without a BMI answer, so the
# "BMI required for new surrogates" rule is pushed into the future here;
# messaging_rules.sql switches it on for its own check.
psql -q -d "$DB" -v ON_ERROR_STOP=1 -c "update public.app_settings set value = '\"infinity\"' where key = 'bmi_required_from'"
# The older suites also assume intended parents need a membership, so "everything
# is free" (migration 38) is switched off here; free_age_rules.sql turns it on.
psql -q -d "$DB" -v ON_ERROR_STOP=1 -c "update public.app_settings set value = 'false' where key = 'free_access'"
for t in tests/db/*_rules.sql; do psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$t"; done
