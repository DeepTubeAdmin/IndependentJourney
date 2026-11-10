# Email setup (Phase 8a): notifications through Resend

The site now emails members when something happens: a welcome note, new
messages, membership receipts and reminders, ID-check results, and alerts for
saved searches. Emails are sent by Resend (free up to 3,000 emails a month,
which is plenty for launch). Everything below is clicking in dashboards.

Do these in order. Nothing goes out until step 6 is done, and queued emails
simply wait, so there is no rush between steps.

## 1. Create the Resend account (5 minutes)

1. Go to https://resend.com/signup and sign up with your business email.
2. No company details are needed for the free plan.

## 2. Add your domain so emails come from independentjourney.com

1. In Resend, click **Domains** in the left sidebar, then **Add Domain**.
2. Type `independentjourney.com`, keep the region default, and click **Add**.
3. Resend shows a table of DNS records (usually three: one **MX** and two **TXT**, sometimes called DKIM and SPF). Keep this tab open.
4. In a second tab open Netlify → **Domains** → `independentjourney.com` → **DNS settings** (or **Manage DNS records**). For each row in the Resend table click **Add new record** in Netlify and copy over:
   - **Record type** (MX or TXT),
   - **Name** (Resend's "Name" column; if it ends in `.independentjourney.com`, Netlify only wants the part before that, for example `resend._domainkey`),
   - **Value** (Resend's "Value" column, paste exactly),
   - for the MX row also the **Priority** (Resend shows it, usually `10`).
5. Back in Resend click **Verify DNS Records**. It can take up to an hour; the status turns to **Verified**. You can continue with the steps below while you wait.

## 3. Create the API key

1. Resend → **API Keys** → **Create API Key**.
2. Name `independent-journey`, permission **Sending access**, domain `independentjourney.com`. Click **Add**.
3. Copy the key now (it starts with `re_`). Resend shows it only once. You paste it into Supabase in step 5.

## 4. Run migration 11 and deploy the function

1. Supabase → **SQL Editor → New query**. Paste the whole file [20261118000000_notifications.sql](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/migrations/20261118000000_notifications.sql) (open the link, click the copy icon) and click **Run**. Safe to run twice.
2. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**. Name it exactly `send-emails`. Replace the code with [send-emails/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/send-emails/index.ts) and click **Deploy function**. (Same steps as the Stripe functions in STRIPE_SETUP.md, section 4.)
3. On the function's page open **Details** and switch **Verify JWT with legacy secret** **off**. The schedule calls it with its own secret header instead.

## 5. Add the secrets

Supabase → **Edge Functions** → **Secrets**. Add three rows and **Save**:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | The `re_...` key from step 3. |
| `EMAIL_FROM` | `Independent Journey <hello@independentjourney.com>` (any name before the @ works once the domain is verified). |
| `CRON_SECRET` | Make up a long password, 30+ random letters and numbers. You will paste the same value in step 6. |

## 6. Run it every 5 minutes

1. Supabase → **Integrations** (left sidebar) → **Cron** → **Enable** if asked, then open **Jobs** → **Create job**.
2. Fill in:
   - **Name**: `send-emails`
   - **Schedule**: choose **Every 5 minutes** (or type `*/5 * * * *`).
   - **Type**: **Supabase Edge Function**.
   - **Method**: POST. **Edge Function**: `send-emails`. **Timeout**: 5000 ms is fine.
   - **HTTP Headers**: click **Add a new header** and enter name `x-cron-secret`, value = the exact CRON_SECRET from step 5. Leave the Authorization header the dashboard adds.
3. Click **Create cron job**. Within five minutes the first run happens.

## 7. Check it works

1. Send yourself a test: log in as one test account, message the other, and wait up to five minutes. The other account's inbox should get "… sent you a message".
2. Admin dashboard → Overview → **Email delivery** shows queued, sent and failed counts. "Failed" with a Resend error usually means the domain is not verified yet (step 2) or the From address is wrong.
3. Supabase → Edge Functions → `send-emails` → **Logs** shows each run with the counts.
4. Each member controls their own emails under **Settings → Email me about**.

## Optional: branded login emails

Password-reset and confirmation emails still come from Supabase's own sender,
which is limited to a few per hour. When you have time: Supabase →
**Authentication → Emails → SMTP Settings** → enable custom SMTP with host
`smtp.resend.com`, port `465`, username `resend`, password = your `re_` key,
sender `hello@independentjourney.com`. Then those emails also come from your
domain.

## What gets sent, and when

| Email | When | Member can turn off |
| --- | --- | --- |
| Welcome | Right after sign-up | No |
| New message | Someone writes; at most one per conversation per hour | Yes (New messages) |
| Message waiting (free IP) | A surrogate writes to an IP without a membership | Yes (New messages) |
| Receipt | Stripe payment confirmed | Yes (Membership) |
| Ending in a week / ended | 7 days before, and the day after | Yes (Membership) |
| Verified / could not verify | Stripe Identity result | No |
| Verify reminder | Complete but unverified profile, 3 days old; at most two, a week apart | Yes (Tips) |
| Saved-search alert | Daily, when new or updated profiles match | Yes (Saved-search alerts, or per search) |
