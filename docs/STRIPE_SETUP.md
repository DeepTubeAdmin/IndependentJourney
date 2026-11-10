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

Supabase → **Edge Functions** (left menu). For each function below, click **Deploy a new function → Via Editor**, give it the exact name, paste the file contents, and click **Deploy**.

| Function name | File to paste | Verify JWT |
| --- | --- | --- |
| `create-checkout` | `supabase/functions/create-checkout/index.ts` | On (default) |
| `create-verification` | `supabase/functions/create-verification/index.ts` | On (default) |
| `stripe-webhook` | `supabase/functions/stripe-webhook/index.ts` | **Off** |

Each function is one self-contained file, so one paste per function is all it takes. Copies of all three are in your project files under `docs/functions/`.

For `stripe-webhook`, after deploying open the function → **Details** and switch **Verify JWT with legacy secret** (or "Enforce JWT verification") **off**. Stripe does not have a Supabase login; the Stripe signature protects this URL instead.

Copy the URL of `stripe-webhook`. It looks like
`https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`.

## 5. Add the secrets

Supabase → **Edge Functions → Secrets** (or Project Settings → Edge Functions). Add:

| Name | Where to get it |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe dashboard → **Developers → API keys** → "Secret key" (starts with `sk_test_` in test mode, `sk_live_` in live mode). Click Reveal, copy. |
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
