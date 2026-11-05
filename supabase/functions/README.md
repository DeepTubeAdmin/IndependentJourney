# Supabase Edge Functions

Server-side code lives here (one folder per function). Planned functions:

| Function | Phase | Purpose |
| --- | --- | --- |
| `revenuecat-webhook` | 7 | Updates `memberships` when someone subscribes, renews, or cancels |
| `identity-webhook` | 4 | Records Stripe Identity verification results |
| `scan-message` | 6 | Flags scam patterns in new messages |
| `send-email` | 3 | Sends transactional emails through Resend |
| `share-view` | 5 | Returns the public fields of a share link |
| `renewal-reminders` | 7 | Scheduled job: emails members before each renewal |

Secrets (Stripe, RevenueCat, Resend, service-role key) are set in the Supabase
dashboard under Edge Functions → Secrets, never in this repository.
