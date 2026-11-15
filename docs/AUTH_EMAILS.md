# Login emails: confirmation, password reset, email change

Supabase sends these itself. The files in `supabase/email-templates/` give
them a professional look and, more importantly, make them easier to deliver
and to act on:

- **Links point at independentjourney.com**, not `supabase.co`. The email
  domain and the link domain now match, which spam filters like, and the
  one-time token is only used when the page runs in a real browser, so
  corporate mail scanners that "click" links no longer burn it. The page
  `/confirm` on the site does the exchange.
- **Every email also carries a 6-digit code.** People whose mail app hides or
  disables links (Gmail disables links on anything it put in Spam) can type
  the code on the page they just left instead of clicking anything.
- Table-based layout with a button that works in Outlook, preview text, a
  "why you received this" line, and the privacy link. No tracking, one link
  domain, mostly text: all things that score well with filters.

## 1. Make sure Supabase sends through your own domain (5 minutes)

This is the single biggest deliverability fix. Without it, login emails come
from Supabase's shared sender, which is rate-limited (a few per hour) and
often lands in spam or is rejected outright.

Supabase → **Authentication → Emails → SMTP Settings**:

| Field | Value |
| --- | --- |
| Enable Custom SMTP | on |
| Sender email | `hello@independentjourney.com` |
| Sender name | `Independent Journey` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (starts with `re_`; Resend → API Keys) |

Save. From now on these emails appear in Resend → **Emails** like the
notification emails do, so you can see Delivered / Bounced for each one.

## 2. Check the site address Supabase uses in links

Supabase → **Authentication → URL Configuration**:

- **Site URL** must be exactly `https://independentjourney.com` (no trailing
  slash). The templates build their links from it.
- **Redirect URLs** should include `https://independentjourney.com/**`.

## 3. Paste the templates (about 5 minutes)

Supabase → **Authentication → Emails** → **Templates** tab. For each row
below: open the template, replace the **Subject**, select everything in the
**Body (HTML)** box and replace it with the file's contents (click the copy
icon on GitHub), then **Save**.

| Supabase template | Subject | File |
| --- | --- | --- |
| Confirm sign up | Confirm your email for Independent Journey | [confirm-signup.html](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/email-templates/confirm-signup.html) |
| Reset password | Reset your Independent Journey password | [reset-password.html](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/email-templates/reset-password.html) |
| Change email address | Confirm your new email for Independent Journey | [change-email.html](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/email-templates/change-email.html) |
| Magic link | Your Independent Journey log-in link | [magic-link.html](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/email-templates/magic-link.html) |

The first line of each file is a comment with the subject; pasting it along
with the rest is harmless. `{{ .SiteURL }}`, `{{ .TokenHash }}` and
`{{ .Token }}` are filled in by Supabase. The site does not use magic links
today, so that one is only there for completeness.

Then test: sign up with a fresh address, confirm with the button; sign up
with another and confirm by typing the code; request a password reset and
try both ways.

## 4. Domain records (already in place, checked 15 Nov 2026)

Resend's records for `independentjourney.com` are live: DKIM
(`resend._domainkey`), SPF and MX on `send.independentjourney.com`, and a
DMARC record (`_dmarc`, `v=DMARC1; p=none;`). That satisfies Gmail's and
Yahoo's sender requirements. Two optional upgrades for later:

- **Receive mail at hello@independentjourney.com.** The domain has no inbound
  mail today, so replies to any email bounce. A free forwarder such as
  ImprovMX or Cloudflare Email Routing adds an MX record and forwards
  hello@ to your inbox. Replies that bounce are a mild spam signal and look
  unprofessional when someone writes back.
- **Tighten DMARC** to `p=quarantine` once a few weeks of mail have gone out
  cleanly. It tells providers to junk mail that fakes your domain.

## If confirmation emails still do not arrive

1. **Resend → Emails** shows every attempt. "Delivered" means the mailbox
   provider accepted it; look in Junk, Other/Focused (Outlook) or Promotions
   (Gmail), and search the mailbox for "Independent Journey". "Bounced" or
   "Complained" tells you the reason.
2. Members can type the 6-digit code instead of clicking, and can ask for
   the email again: the log-in page shows **Resend the confirmation email**
   when an account is unconfirmed, and the "Didn't get the confirmation
   email?" link works for anyone.
3. For a member who is stuck, you can confirm them by hand: Supabase →
   **Authentication → Users** → open the user → **Confirm email**.
4. New domains build reputation slowly. Steady, wanted mail for a few weeks
   is what moves the needle; there is no setting that skips it.
