# Launch checklist (Phase 10)

Two parts. **Part A** is the end-to-end test: walk through it once on the live
site before you tell anyone about it, and again after any big change.
**Part B** is the list of dashboard settings to switch on for production.

Tick each line as you go. Anything that fails, send to Claude with the step
number and what you saw.

You will need **five test accounts**, each with its own email address (Gmail
lets you use `yourname+ip1@gmail.com`, `yourname+sur1@gmail.com` and so on):

| Account | Role | Set-up |
| --- | --- | --- |
| IP-FREE | Intended parent | Sign up only. Do NOT finish the questionnaire. |
| IP-PAID | Intended parent | Finish the questionnaire with 3 photos. Has an active membership (free launch membership, or Admin → Members → Grant). |
| IP-LAPSED | Intended parent | Like IP-PAID, then Admin → Members → End membership. |
| SUR-NEW | Surrogate | Sign up only. Do NOT finish the questionnaire. |
| SUR-DONE | Surrogate | Finish the questionnaire with 3 photos. Visibility "Also in public previews". Later: Admin → Verified. |

Your own admin account (with 2FA) is the sixth.

---

## Part A. End-to-end test

### A1. Signed-out visitor (open a private/incognito window)

- [ ] 1. Homepage loads with the beta welcome pop-up. "Just looking for now" closes it and it does not come back on reload.
- [ ] 2. Homepage shows real member cards (opted-in and verified only) or clearly labelled example cards.
- [ ] 3. **Browse** shows at most 5 limited previews, both surrogates and intended parents, only from members who chose "Also in public previews". Each shows first name, state, ONE unblurred photo, a few headline tags and a Verified / Not verified label. No city, no bio, no contact details.
- [ ] 4. Opening a preview card and pressing **Message** sends you to sign-up, not to a message box.
- [ ] 5. Resources, How it works, Terms, Privacy and Disclaimer open without logging in.
- [ ] 6. A share link (`/s/…`) from SUR-DONE (verified) opens without login and shows no last name, city, phone or email. (It has no Message button yet; see SECURITY_REVIEW.md, "Known gaps".)
- [ ] 7. Typing a made-up address like `/profile/00000000-0000-0000-0000-000000000000` shows the "not found" page, not an error.

### A2. Sign-up, login, password

- [ ] 8. Sign up as SUR-NEW. The Terms checkbox text mentions that messages may be reviewed by the safety team and that you are an individual, not an agency.
- [ ] 9. Sign-up refuses to continue until the "I am 21 or older" (surrogate) / "18 or older" (intended parent) box is ticked, and a surrogate date of birth under 21 is refused on the questionnaire.
- [ ] 10. The welcome email arrives (check Resend → Emails if not; check Admin → Email delivery).
- [ ] 11. Log out, then use **Forgot password**. The reset email arrives and the new password works.
- [ ] 12. Admin → Settings → `allowed_states`: set it to `["TX"]`, then as SUR-NEW choose a different state on the location step. Saving is refused with "not open to members in … yet". Set it back to `[]`.

### A3. Surrogate with an unfinished profile (SUR-NEW)

- [ ] 13. Browse shows **intended parents only**, as limited previews. No surrogates anywhere.
- [ ] 14. Opening an IP preview and pressing Message says you need to finish your profile first; no message can be sent.
- [ ] 15. SUR-NEW does not appear in Browse for any other account (check from IP-PAID). Profiles are hidden until complete.
- [ ] 16. The questionnaire can be left half-way and resumed later from Home → "Finish my profile".

### A4. Surrogate with a complete profile (SUR-DONE)

- [ ] 17. After the third photo and the last required question, the review page says the profile is complete and shows the "Not verified" label.
- [ ] 18. Browse: intended parents only. Opening one shows the **full** profile (all answers, all photos, bio). Health self-reports are never shown to anyone.
- [ ] 19. Message IP-FREE: the message sends, and the status reads along the lines of "Delivered. They will see your message once they have an active membership".
- [ ] 20. Message IP-PAID: sends normally. IP-PAID gets a "new message" email within about 5 minutes.
- [ ] 21. Start new conversations until the daily limit (Admin → Settings) is reached; the next one is refused with a clear message.
- [ ] 22. Save an IP profile; it appears under Saved. Unsave removes it.
- [ ] 23. Settings → Email me about: untick "New messages", send a message to SUR-DONE from IP-PAID, confirm no email arrives. Tick it back on.
- [ ] 24. Settings → Download a copy of my data gives a JSON file with your answers and messages and nobody else's.
- [ ] 25. Block IP-LAPSED from their profile page. They disappear from your Browse and can no longer message you. Unblock restores it.
- [ ] 26. Report IP-LAPSED from their profile page. The report appears in Admin → Reports.
- [ ] 27. Identity verification: Settings/Home → Verify my identity opens Stripe Identity (test mode). On success the Verified label appears and the "identity verified" email arrives. (Skip if Stripe Identity is not set up yet.)
- [ ] 28. As an unverified member, try to create a share link: refused. After Admin → Verified, Create share link works and Revoke stops it working.

### A5. Intended parent, free (IP-FREE)

- [ ] 29. Browse shows **surrogates only**, as limited previews (one photo, first name, state, headline tags, Verified / Not verified). Filters work; the map view shows ZIP-level pins, not street addresses.
- [ ] 30. Opening a surrogate shows only the preview with a membership prompt. No bio, no detailed answers, no extra photos.
- [ ] 31. Messages shows the conversation from SUR-DONE as **locked**: sender preview only, body hidden, with a clear "Become a member to read" prompt. The "locked message" email arrived.
- [ ] 32. Save this search → name it → "Save and alert me". It appears in Settings → Saved searches. (Alerts email limited info only.)
- [ ] 33. Membership page shows the price and term from Admin → Settings (change the price there, reload, change it back). It states one payment, no automatic renewal.
- [ ] 34. Checkout (Stripe test card 4242 4242 4242 4242) succeeds, the receipt email arrives, and Messages → the locked conversation is now readable. (If the launch free membership is on, use IP-LAPSED to test this instead.)

### A6. Intended parent, active membership (IP-PAID)

- [ ] 35. Browse: surrogates only, full profiles open, verified members listed before unverified ones, recently active first.
- [ ] 36. Message SUR-DONE and read replies. The "Never send money" banner shows in the conversation.
- [ ] 37. Opening a conversation with an **unverified** surrogate shows the "This member hasn't verified their identity" warning.
- [ ] 38. Send a message containing "wire me a processing fee via Zelle". The recipient sees a scam warning and the message is flagged in Admin → Messages (flagged only).
- [ ] 39. Membership page shows the end date and a Renew button.
- [ ] 40. Try to open a surrogate's health self-reports from anywhere: there is no way to.

### A7. Intended parent, lapsed (IP-LAPSED)

- [ ] 41. After Admin → End membership: Browse drops back to previews, existing conversations show as locked but are still listed, and the "membership ended" email arrived.
- [ ] 42. Renewing restores everything with no lost messages.

### A8. Admin (your account)

- [ ] 43. `/admin` refuses an account that is not in the admin list, and refuses an admin who has not done 2FA this session.
- [ ] 44. Members: search, open a member, Verify / Unverify, Suspend, Ban, Grant membership, End membership. A banned member cannot log in to anything useful and vanishes from Browse.
- [ ] 45. Messages: search by member and by keyword, open a conversation, Hide a message, Warn a member. Every one of these appears in Audit log with your name and time.
- [ ] 46. Reports: resolve the report from step 26 with a note.
- [ ] 47. Flags: the agency/suspicious-bio flag fires when a bio contains "our agency" or a website link.
- [ ] 48. Settings: change `membership_price_usd`, `inactive_after_days`, the daily limits and the beta switches; each takes effect without a code change.
- [ ] 49. Overview tiles (members, verified, memberships, deleted in 30 days) and Email delivery (queued, sent, failed) show sensible numbers.

### A9. Account deletion (use SUR-NEW last)

- [ ] 50. Settings → Delete my account → type DELETE. You land on the homepage with the goodbye notice, cannot log back in, and the account is gone from Admin → Members. "Accounts deleted (30 days)" went up by one.
- [ ] 51. Your own admin account is refused from deleting itself in Settings.

### A10. Phones and accessibility

- [ ] 52. On a phone: homepage, Browse, a profile, a conversation and the questionnaire are usable without sideways scrolling. Buttons are easy to tap.
- [ ] 53. Zoom the browser to 200%: nothing overlaps or gets cut off.
- [ ] 54. Keyboard only (Tab / Enter): you can sign up, browse and send a message.
- [ ] 55. Netlify's deploy comment on the latest pull request shows Accessibility 90+ and Best Practices 100 (Lighthouse).

---

## Part B. Production settings (one-time, before announcing)

### B1. Supabase

- [ ] Upgrade the project to **Pro** ($25/month) so it never pauses and gets daily backups: Project Settings → Billing. Then Database → Backups: confirm daily backups are on (enable Point-in-time recovery only if you want to pay extra for it).
- [ ] Authentication → Sign In / Providers → Email: **Confirm email ON**, Secure email change ON, minimum password length 8 or more.
- [ ] Authentication → Attack protection (or Security): **Leaked password protection ON**, keep the default rate limits (sign-ups, emails, token refreshes).
- [ ] Authentication → URL configuration: Site URL `https://independentjourney.com`; Redirect URLs include `https://independentjourney.com/**` and `https://*--independentjourney.netlify.app/**` (deploy previews).
- [ ] Authentication → Emails (SMTP): custom SMTP through Resend (see RESEND_SETUP.md, optional step) so sign-up and reset emails are not rate-limited and come from `@independentjourney.com`.
- [ ] Project Settings → API: confirm the app only ever uses the **publishable/anon** key. If the secret key was ever pasted anywhere outside Supabase, rotate it here (Generate new secret) and update the Edge Function secrets.
- [ ] Edge Functions → Secrets: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are the **live** keys (`sk_live_…`, `whsec_…` from the live webhook), RESEND_API_KEY, EMAIL_FROM, CRON_SECRET, SITE_URL = `https://independentjourney.com`.
- [ ] Integrations → Cron: `send-emails` runs every 5 minutes and the Admin → Email delivery tile shows "last sent" moving.
- [ ] Database → Advisors (Security advisor): run it; everything should be green or "info". Send Claude a screenshot of anything red.
- [ ] Storage → profile-photos: bucket is **private** (not public).
- [ ] Admin → Settings in the site: allowed states list is final, daily limits are sensible, `beta_banner_enabled` and `beta_free_membership_months` are what you want for launch.

### B2. Stripe

- [ ] Toggle from Test mode to Live. Create the live webhook endpoint pointing at `https://<project>.supabase.co/functions/v1/stripe-webhook` with the same events as the test one, and paste its signing secret into Supabase secrets (above).
- [ ] Stripe → Settings → Public details: business name, support email, and a statement descriptor like `INDEPENDENT JRNY` so card statements make sense.
- [ ] Stripe Identity: enable live mode and confirm pricing (about $1.50 per check) is acceptable.
- [ ] Run test A5-34 once more with a real card for $199 and refund yourself from the Stripe dashboard. Confirm the membership ends after the refund (the webhook handles this).

### B3. Netlify

- [ ] Domain management: `independentjourney.com` and `www` both resolve, HTTPS certificate active, "Force HTTPS" on.
- [ ] Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_ENV=production` set for Production. Deploy previews use the same Supabase project; that is fine for now.
- [ ] Deploy notifications: turn on email on failed production deploys (Project configuration → Notifications).
- [ ] Forms/Functions/Analytics: none needed. Netlify Analytics is optional ($9/month) if you want visitor counts without cookies.

### B4. Resend

- [ ] Domain `independentjourney.com` shows **Verified** (DKIM, SPF and the return-path record all green).
- [ ] Send a welcome email to a Gmail and an Outlook address; both land in the inbox, not spam.
- [ ] Add a DMARC record in Netlify DNS: Name `_dmarc`, type TXT, value `v=DMARC1; p=none; rua=mailto:you@yourdomain` (start with `p=none`; tighten later).

### B5. Legal and content (attorney)

- [ ] Attorney has reviewed Terms, Privacy Policy and Disclaimer, including: message review by admins, health self-reports under state consumer-health-data laws, the surrogate compensation and state-restriction notes, and the one-time (non-renewing) membership wording.
- [ ] Remove the "Draft for attorney review" banner from the three legal pages (ask Claude; it is a one-line change) and bump the consent version so existing members re-accept.
- [ ] Resources articles are marked "general information, not advice" and have been read once by a human.
- [ ] Decide on a support email address (for example support@independentjourney.com, forwarded to your inbox). There is none in the site yet; ask Claude to add it to the footer, the legal pages and the "Contact us" wording, and use it in the store listings.

### B6. After launch (weekly for the first month)

- [ ] Admin → Reports and Flags: empty or handled.
- [ ] Admin → Email delivery: failed = 0.
- [ ] Supabase → Reports → API usage and Database size: well under the Pro limits.
- [ ] Stripe → Payments: no disputes.
- [ ] Netlify → Deploys: last production deploy green.
