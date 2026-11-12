# Stripe setup (Phase 7): memberships and ID checks

Stripe handles two things for Independent Journey: the $199 intended-parent
membership (a one-time charge per 3-month term) and the free-for-members
identity check (Stripe Identity, about $1.50 per completed check, billed to
us). Everything below is clicking in dashboards; no code changes.

Do these in order. Steps 1 to 3 are one-time. Use **test mode** first, then
repeat step 4 in live mode when you are ready to take real money.

## 1. Create the Stripe account (about 15 minutes)

1. Go to https://dashboard.stripe.com/register and sign up with your business email.
2. Stripe asks about the business. Choose **Individual / sole proprietor** (you can switch to an LLC later without touching the site), enter your legal name, SSN, address, bank account for payouts, and the website `https://independentjourney.com`.
3. Describe the product as: "Online membership giving intended parents access to surrogate profiles and messaging on an introduction platform. No medical or escrow services."
4. Finish activation when Stripe asks. Until it is activated you can still use **test mode** for everything below.

## 2. Turn on Stripe Identity

1. In the Stripe dashboard, open **More → Identity** (or search "Identity" in the top search box).
2. Click **Get started** and accept the Identity terms. Keep the defaults.
3. Nothing else to configure: our code asks Stripe for a document + selfie check each time a member clicks Verify.

## 3. Run migration 10 in Supabase

1. Supabase → **SQL Editor → New query**.
2. Paste the whole file `20261117000000_payments.sql` (also in your project files) and click **Run**. It is safe to run twice.

## 4. Deploy the three Edge Functions

An Edge Function is a small program that runs on Supabase's servers. You will create three. Each one is a single file that you copy from GitHub and paste into Supabase's browser editor. Do the steps below three times, once per row of this table:

| Function name (type exactly) | File to copy | Verify JWT |
| --- | --- | --- |
| `create-checkout` | [create-checkout/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/create-checkout/index.ts) | leave ON |
| `create-verification` | [create-verification/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/create-verification/index.ts) | leave ON |
| `stripe-webhook` | [stripe-webhook/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/stripe-webhook/index.ts) | turn OFF |

(Until PR #14 is merged, replace `main` in those links with `phase-7-payments`.)

### 4a. Copy the file from GitHub

1. Open the file's GitHub link above.
2. Near the top right of the file there is a row of small icons. Click the **copy** icon (two overlapping squares, tooltip "Copy raw file"). The whole file is now on your clipboard. If you do not see it, click **Raw**, then select all (Ctrl+A / Cmd+A) and copy (Ctrl+C / Cmd+C).

### 4b. Create the function in Supabase

1. Supabase dashboard → your project → **Edge Functions** in the left sidebar (lightning-bolt icon).
2. Click **Deploy a new function**. A menu opens; choose **Via Editor**. (If you see template cards instead, pick **Hello World** or "Start from scratch"; the code gets replaced anyway.)
3. At the top of the editor there is a field with the function name (for a template it says `hello-world`). Click it and change it to the exact name from the table, for example `create-checkout`. Lower-case, hyphen, no spaces.
4. Click inside the code area, select everything (Ctrl+A / Cmd+A), delete it, and paste (Ctrl+V / Cmd+V) the file you copied. The first line should read `/**` and a few lines down `import Stripe from 'npm:stripe@18.5.0';`.
5. Click **Deploy function** at the bottom right. Wait 10 to 30 seconds for "Function deployed".
6. You land on the function's page. The URL shown there is the function's address, like `https://xxxx.supabase.co/functions/v1/create-checkout`.

### 4c. Only for stripe-webhook: switch off JWT verification

Stripe calls this function directly and has no Supabase login, so the login check must be off for this one function (the Stripe signature protects it instead).

1. On the `stripe-webhook` function page, open the **Details** tab (sometimes shown as a settings gear).
2. Find the toggle labelled **Verify JWT with legacy secret** (older dashboards: **Enforce JWT Verification**) and switch it **off**. Confirm if asked.
3. Copy the function URL shown on this page. It ends in `/functions/v1/stripe-webhook`. You need it in step 6.

### 4d. Check your work

Edge Functions list should show three functions, all "Active". If you pasted the wrong file into one, open it, click **Edit function** (or the code tab), replace the code and click **Deploy updates**.

## 5. Add the secrets

Supabase → **Edge Functions** → **Secrets** tab at the top of the page (or Project Settings → Edge Functions → Secrets). For each row below type the **Key**, paste the **Value**, click **Add another** for the next one, then **Save**:

| Name | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe dashboard → **Developers → API keys** → "Secret key" (starts with `sk_test_` in test mode, `sk_live_` in live mode). Click Reveal, copy. Newer Stripe accounts only offer **Create secret key** with a permissions list and give a key starting `rk_live_`; that works too. Set these to **Write**: Checkout Sessions, Products, Prices, Customers, Identity (Verification Sessions and Verification Reports). Leave the rest at None. |
| `STRIPE_WEBHOOK_SECRET` | Created in step 6 below (starts with `whsec_`). Add it after step 6. |
| `SITE_URL` | `https://independentjourney.com` |

Never paste these keys anywhere else, and never into the website settings on Netlify.

## 6. Tell Stripe where to send events

1. Stripe dashboard → **Developers → Webhooks → Add destination** (older dashboards: "Add endpoint").
2. Endpoint URL: paste the `stripe-webhook` URL from step 4.
3. Events to send: click **Select events** and tick these five:
   - `checkout.session.completed`
   - `charge.refunded`
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.processing`
   - `identity.verification_session.canceled`
4. Click **Add destination**. On the next page click **Reveal** under "Signing secret", copy the `whsec_...` value, and save it as `STRIPE_WEBHOOK_SECRET` in Supabase (step 5).

## 7. Test it in test mode

1. On the live site, log in as an intended parent and click **Get a membership** on the home page, then **Continue to secure checkout**.
2. On Stripe's page use card number `4242 4242 4242 4242`, any future expiry, any CVC and ZIP.
3. You return to the Membership page; within a few seconds it says the membership is active. Browse a surrogate and confirm the full profile opens and messaging works.
4. In Stripe → **Payments**, open that payment and click **Refund**. Back on the site the membership should end (reload the Membership page).
5. Log in as any member and click **Verify my identity (free)**. In test mode Stripe offers a "Verify with a test document" shortcut; choose the successful outcome. Your home page should show "Identity: Verified" within a minute.
6. Admin → Overview shows Active memberships and Revenue this month; the member page shows payments and ID checks.

## 8. Go live

When real sales should start, in Stripe switch off **Test mode** (toggle top-right), repeat step 6 in live mode to get a live `whsec_` secret, and replace both `STRIPE_SECRET_KEY` (now `sk_live_...`) and `STRIPE_WEBHOOK_SECRET` in Supabase secrets. Nothing else changes.

## Changing the price or term

Admin → Settings → `membership_price_usd` and `membership_term_months`. Checkout reads them each time, so the change is immediate and no Stripe product needs editing.
