# Login emails: confirmation, password reset, email change

Supabase no longer sends these itself. Instead it calls our Edge Function
`auth-email` (the "Send Email" auth hook), which sends the email through
Resend's API and writes a line to the `auth_email_log` table. Why this is
more reliable than the old SMTP route:

- **One fast HTTP call to Resend** instead of an SMTP conversation that can
  time out or be throttled quietly. Resend answers "accepted" or an error
  within a second.
- **Every attempt is recorded.** Supabase → **Table Editor → auth_email_log**
  shows who was emailed, when, sent or failed, and the reason. A "never got
  the email" report takes seconds to check. Resend → **Emails** then shows
  delivered / bounced / spam for the same message (`provider_id` is Resend's
  id).
- **Failures are visible to the person.** If Resend rejects the email, the
  sign-up page says "We could not send the email just now" instead of
  pretending it went out.
- **The templates live in code**, so there is nothing to paste into the
  dashboard and nothing can drift. Same look as before: button that works in
  Outlook, a 6-digit code for people whose mail app blocks links, links that
  point at independentjourney.com (not supabase.co), plain-text version.

## Setup (about 15 minutes, in this order)

Do steps 1–3 before step 4. Once the hook is on, sign-ups fail if the
function is not ready.

### 1. Run migration 28

Open [20261205000000_auth_email_log.sql](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/migrations/20261205000000_auth_email_log.sql),
click the copy icon, paste into Supabase → **SQL Editor**, **Run**. Safe to
run twice.

### 2. Deploy the `auth-email` function

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name: `auth-email` (exactly).
3. Replace everything in the editor with
   [supabase/functions/auth-email/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/auth-email/index.ts)
   (click the copy icon on GitHub), then **Deploy**.
4. On the function's page open **Details** and switch **Verify JWT with
   legacy secret** **off**. Supabase Auth signs its requests with the hook
   secret instead.
5. Still on that page, copy the function's **URL**. It looks like
   `https://<project id>.supabase.co/functions/v1/auth-email`.

### 3. Turn on the hook and give the function its secret

1. Supabase → **Authentication** → **Hooks** → **Send Email** → **Add hook**
   (or Enable).
2. Hook type: **HTTPS**. URL: the function URL from step 2.
3. Click **Generate secret**, then copy the whole value (it starts with
   `v1,whsec_`). **Save** the hook. Do not close the tab yet; the secret is
   only shown here.
4. Supabase → **Edge Functions** → **Secrets** → **Add new secret**:
   name `SEND_EMAIL_HOOK_SECRET`, value = the secret you just copied. Save.

The function also uses `RESEND_API_KEY`, `EMAIL_FROM` and `SITE_URL`, which
already exist from the notification emails setup.

### 4. Test

Sign up with a fresh address. Then:

- **Table Editor → auth_email_log**: one row, `action = signup`,
  `status = sent`. If it says `failed`, the `error` column tells you why
  (usually a Resend key or quota problem).
- **Resend → Emails**: the same message, Delivered.
- Confirm with the button, then sign up with another address and confirm by
  typing the code. Request a password reset and try both ways.

If no row appears at all, Supabase never called the function: check that the
hook is enabled and the URL ends in `/auth-email`.

### 5. Limits worth raising

- Supabase → **Authentication** → **Rate Limits** → "Rate limit for sending
  emails": default is 30 per hour. Set it to **200** so a busy sign-up day is
  not silently capped. (Only editable because custom SMTP is on; leave SMTP
  configured even though the hook now does the sending.)
- Resend's free plan is **100 emails per day**, counting notifications too.
  Resend → **Usage** shows the count. If you get close, Resend's $20/month plan
  lifts it to 50,000.

## When someone says the email never arrived

1. **auth_email_log** (Table Editor, newest first; filter by `email`):
   - no row: they typed a different address, or the hook is off.
   - `failed`: the `error` column says why; fix and ask them to use
     **Send the email again** on the verify page.
   - `sent`: Resend accepted it, go to step 2.
2. **Resend → Emails**, search the address: Delivered means the mailbox
   provider took it, so it is in Spam, Junk, Promotions or Other. Bounced or
   Complained gives the reason.
3. The person can always type the **6-digit code** instead of clicking, and
   can request the email again from the verify-email page or the log-in page.
4. To unblock someone by hand: Supabase → **Authentication → Users** → open
   the user → **Confirm email**.

## Domain records (checked 15 Nov 2026)

Resend's records for `independentjourney.com` are live: DKIM
(`resend._domainkey`), SPF and MX on `send.independentjourney.com`, and a
DMARC record (`_dmarc`, `v=DMARC1; p=none;`). That satisfies Gmail's and
Yahoo's sender requirements. Two optional upgrades for later:

- **Receive mail at hello@independentjourney.com.** The domain has no inbound
  mail today, so replies to any email bounce. A free forwarder such as
  ImprovMX or Cloudflare Email Routing adds an MX record and forwards
  hello@ to your inbox.
- **Tighten DMARC** to `p=quarantine` once a few weeks of mail have gone out
  cleanly.

## Changing the wording

Edit the text in `supabase/functions/auth-email/index.ts` (the `build`
function has one block per email type), then paste the whole file into the
function in the dashboard again and **Deploy**.
