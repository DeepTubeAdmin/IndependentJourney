# Agency accounts

Added 2026-11-12 (migration 23, `supabase/migrations/20261130000000_agencies.sql`).

## What an agency account is

- A third kind of login next to surrogate and intended parent. It has **no profile of its own**.
- Once it has filled in its agency details, the agency posts **client profiles** (surrogates or intended parents) using the
  same questionnaire members use. Each one is labelled **Agency: <name>** everywhere it appears and shows
  a short agency card (website, states, services, fee ranges) on the full profile.
- Messages to a client profile go to the agency's inbox. The agency replies in the client's name and every
  such message is labelled with the agency.
- Agency client profiles skip the private health step. Instead they answer whether the surrogate is
  **cleared by an OB** and **cleared by a fertility clinic**, and which clinic.
- Agencies never see any member's health self-report.

## Member choices

- On step 1 of the member questionnaire everyone now answers:
  - **Are you working with an agency?** (Independent / Independent, also with an agency: name shown as
    "Independent · with <agency>").
  - **I am open to the following types of journeys:** Independent only / Agency only / Both.
    **Independent only** hides agency profiles from that member's browse and homepage, and an agency
    cannot open a conversation with them (the member can still write to an agency profile first, and
    the agency can then reply). Agency only and Both place no restriction.
- Browse has **Independent only** and **Agency profiles only** checkboxes.

## Your part: the Agencies section (admin dashboard)

Since migration 34 (2026-11-19) agencies are **not approved by hand**. An agency account is active as
soon as it signs up, the same as a surrogate or intended-parent account.

1. An agency signs up at `/sign-up?role=agency` (name, website, contact) and fills in its agency
   details. It can then post client profiles straight away. You get one email, **"New agency joined"**,
   when it finishes its details. Nothing is needed from you.
2. **Admin → Agencies** lists every agency. Tap one to see website, contact, states, services, fee
   ranges, its consent attestation and its client profiles.
3. **Suspend** (with a short note the agency sees) hides every client profile instantly and emails the
   agency. **Reinstate** brings the agency and its profiles back and emails it.

There is no verification badge for agencies. Client profiles show **Not verified** like any member
who has not done the ID check (the agency cannot run Stripe Identity for a client).

## Settings (Admin → Settings, or the `app_settings` table)

| key | default | meaning |
| --- | --- | --- |
| `agency_pricing_mode` | `"free"` | `free` now. Later `subscription`, `per_profile` or `both`. Anything but `free` blocks agencies whose `paid_until` is in the past from adding profiles or messaging. |
| `agency_subscription_price_usd` | `199` | Monthly price, shown when subscriptions are turned on. |
| `agency_profile_price_usd` | `199` | Per-profile price for later. |

**Stripe for agencies is not built yet.** Switching the mode away from `free` today would lock every
agency out, because nothing sets `paid_until`. When you want to start charging, ask for the Stripe
subscription step; the database side (`paid_until`, `agency_access()`) is ready for it.

## Emails

New templates in `supabase/functions/send-emails/index.ts`: `agency_welcome`, `agency_ready` (to you:
"New agency joined"), `agency_approved` (sent when you reinstate), `agency_suspended`. (`agency_pending` and
`agency_rejected` are no longer sent.) Message emails now say
"(posted by <agency>)" for agency senders and "This message is for your client <name>" to agencies.
After merging, re-deploy the function: copy the file's contents into the **send-emails** function in the
Supabase dashboard and click Deploy.

## Deleting

- An agency can remove a client profile from its dashboard (photos, conversations and messages go too).
- Deleting the agency account (Settings) removes all its client profiles first.
- Deleting the agency's login in the Supabase dashboard does the same through a trigger.

## Known limits (ask when you want them)

- One login per agency; no staff sub-accounts.
- Agency-posted intended-parent profiles get full access through the agency; no membership is needed.
- No Stripe subscription for agencies yet (see Settings above).
- Legal text in Terms has a short "Agency accounts" clause for the attorney to review.
