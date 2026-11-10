# Supabase Edge Functions

Server-side code lives here (one folder per function). Planned functions:

| Function | Phase | Purpose |
| --- | --- | --- |
| `create-checkout` | 7 | Starts a Stripe Checkout session for the IP membership (built) |
| `create-verification` | 7 | Starts a free Stripe Identity check for the member (built) |
| `stripe-webhook` | 7 | Receives Stripe events: payments, refunds, ID-check results (built) |
| `revenuecat-webhook` | 8 | Updates `memberships` from Apple/Google in-app purchases |
| `scan-message` | 6 | Flags scam patterns in new messages |
| `send-emails` | 8a | Scheduled every 5 minutes: queues due reminders and sends the outbox through Resend (built) |
| `share-view` | 5 | Returns the public fields of a share link |

Secrets (Stripe, RevenueCat, Resend) are set in the Supabase dashboard under
Edge Functions → Secrets, never in this repository. Needed now:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`,
`CRON_SECRET`. The Supabase URL,
anon key and service-role key are provided to every function automatically.
