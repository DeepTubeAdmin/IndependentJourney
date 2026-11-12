# Login emails: confirmation, password reset, email change

Supabase sends these itself (through the Resend SMTP settings you already
set up). Out of the box they are plain, unbranded messages with a long
`supabase.co` link, which Outlook and Gmail sometimes hide or drop. The files
in `supabase/email-templates/` give them the same look as the welcome and
message emails.

## Paste them in (about 5 minutes)

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
with the rest is harmless. The `{{ .ConfirmationURL }}` placeholders are
filled in by Supabase. The site does not use magic links today, so that one
is only there for completeness.

## If confirmation emails still do not arrive

1. **Resend → Emails** shows every attempt. "Delivered" means the mailbox
   provider accepted it; look in Junk, Other/Focused (Outlook) or Promotions
   (Gmail), and search the mailbox for "Independent Journey".
2. Members can ask for it again: the log-in page shows **Resend the
   confirmation email** when an account is unconfirmed, and the "Didn't get
   the confirmation email?" link works for anyone.
3. For a member who is stuck, you can confirm them by hand: Supabase →
   **Authentication → Users** → open the user → **Confirm email**.
4. If a whole provider (e.g. Outlook) keeps junking them, the remaining lever
   is a Supabase custom auth domain so links do not point at `supabase.co`.
   That is a paid Supabase add-on (about $10/month), so it is a decision for
   later, not a default.
