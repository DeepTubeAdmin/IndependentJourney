# Security review (Phase 10, 2026-11-10)

A plain-English record of what was checked before launch, what was fixed,
and what still needs a human. Re-read this after any change to the database
rules or the Edge Functions.

## What was reviewed

- All 15 migrations: every table has row-level security on, and every policy
  was read against the access table in the master prompt.
- All 90-odd database functions: which ones run with elevated rights
  (`security definer`), whether each one checks who is calling, and who is
  allowed to execute it. Every one of them pins `search_path`, which closes
  the most common Postgres privilege-escalation hole.
- Storage: the `profile-photos` bucket rules for owners, members, anonymous
  visitors and share links.
- The four Edge Functions: how each one proves who is calling.
- The app bundle: what secrets could leak into the browser.
- Netlify headers, the share-link pages, and the sign-up disclosures.
- The automated test suite (`tests/db/run.sh`, nine suites) runs every
  access rule from the table as a real database user of each role.

## Fixed in this phase (migration 15 + tests)

| # | Finding | Risk | Fix |
| --- | --- | --- | --- |
| 1 | `admin_deleted_count_30d()` had no admin check. | Low: any logged-in member could read a single number. | Added `assert_admin()`. A new test calls **every** `admin_*` function as a non-admin and fails the build if any one of them answers. |
| 2 | `admin_log()` (the audit-log writer) could be called by any member. | Medium: a member could write fake audit entries. | Execute right removed from members; only the admin functions (which run with elevated rights) can call it. |
| 3 | `allowed_states` existed as a setting but nothing enforced it. | Medium: the state allow-list you were told you had did not work. | Database trigger refuses a profile state outside the list, with a friendly message shown on the location step. Empty list = open to all. |
| 4 | No "download my data" feature (data-rights requirement; Apple and Google ask about it). | Compliance | `export_my_data()` + Settings → "Download a copy of my data". Only the caller's own rows, other members appear by display name only. |
| 5 | Anonymous visitors technically had execute rights on admin functions (they would have been refused, but defence in depth). | Low | Execute revoked from `anon` on every `admin_*` function, now and in the test. |
| 6 | Homepage still said "Launching soon · sign-up opens shortly". | Trust | Reworded. |

## Confirmed good (no change needed)

- **Role separation is in the database.** `can_preview`, `can_view_full`,
  `browse_profiles`, `my_access_to` and the storage policies all refuse
  same-role views, incomplete profiles, banned and suspended accounts.
  Surrogates never see surrogates; intended parents never see intended
  parents; anonymous visitors get at most 5 opted-in previews.
- **Health self-reports** are readable only by their owner and admins. There
  is no sharing path left in the app or the database.
- **Private details** (last name, date of birth, city, phone, ZIP) are in a
  separate table only the owner and admins can read. Browse and share views
  never join to it.
- **Messaging rules**: `send_message` enforces the access table, daily limits
  from settings, blocks, bans, and scam-pattern flags. Locked messages are
  delivered but unreadable until the intended parent has a membership.
- **Admin**: every admin function calls `assert_admin()`, which requires both
  a row in `admin_roles` and a two-factor (`aal2`) session. Every admin action
  writes to the audit log.
- **Payments**: the Stripe webhook verifies Stripe's signature; the only
  functions that can grant a membership from a payment are callable by the
  service role alone. Price and term are read from settings at checkout time.
- **Edge Functions** use the caller's own login token to find out who they
  are and the service key only after that. The cron function needs the
  `CRON_SECRET` header. No secret is read from the request.
- **The app bundle** contains only the Supabase URL and the publishable key.
  The service key, Stripe keys and Resend key live in Supabase secrets.
- **Netlify** sends `X-Frame-Options: DENY`, `nosniff`, a strict referrer
  policy, `Permissions-Policy` (no camera/mic/location) and HSTS. Share pages
  carry `noindex, nofollow`.
- **Disclosures**: the sign-up checkbox covers message review by the safety
  team, the "individual, not an agency" attestation and the age attestation.
  The "Never send money" banner is on profiles, in conversations and on the
  membership page. The unverified-sender warning uses the exact wording from
  the master prompt.
- **Deletion** removes everything tied to the login, including photos, and
  refuses admin accounts so audit history survives.

## For you to do in the dashboards (see LAUNCH_CHECKLIST.md Part B)

- Confirm email ON, leaked-password protection ON, Site URL and redirect URLs set.
- Rotate the Supabase secret key if it was ever pasted outside Supabase (it was, briefly, in an early phase).
- Run Supabase → Database → Advisors (Security) and send a screenshot of anything red.
- Keep `profile-photos` private.
- Live Stripe keys and the live webhook secret before the first real payment.

## For your attorney

- Message review by admins: Terms and Privacy state who can read, why, and
  that access is logged. Confirm this is enough under state privacy and
  consent laws.
- Health self-reports (yes/no and short answers) may count as consumer health
  data in Washington, Nevada, Connecticut and others. The site stores them,
  never shows them to other members, and deletes them with the account.
- Compensated surrogacy is restricted in some states (Nebraska and Louisiana
  are the usual examples; Michigan lifted its ban in 2025; check the current
  list). The `allowed_states` setting now works if you decide to exclude any.
- Membership is a one-time, non-renewing charge, so auto-renewal disclosure
  laws do not apply. If you ever switch to auto-renew, that wording must change.
- Cookie banner: the site sets no analytics or advertising cookies. It uses
  browser storage only to keep you logged in and to remember that you closed
  the beta pop-up. Most counsel treat that as "strictly necessary" and skip
  the banner; confirm.

## Known gaps (not security holes, but on the list)

- **Share links** show every photo and the full journey answers of a verified
  member who created the link, not a reduced "public" subset, and the share
  page has no Message button yet. Decide whether the share view should show
  less; both are small changes.
- **Phone verification, disposable-email blocking, reverse image search** and
  device fingerprinting were deliberately skipped to stay in budget. The
  "Not verified" label, ID verification, daily limits, scam scanning and bio
  flags are the protections in place. Revisit if fake profiles appear.
- **Content Security Policy** header: not set. Adding one to an Expo web app
  needs testing because of inline scripts; worth doing after launch.
- **Apple / Google sign-in**: not offered, so Apple's "Sign in with Apple"
  rule does not apply. If Google sign-in is ever added, Apple sign-in must be too.
- **Backups**: depend on the Supabase Pro plan. Until you upgrade, there are none.
