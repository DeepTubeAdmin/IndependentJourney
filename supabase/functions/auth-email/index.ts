/**
 * auth-email: sends the login emails (confirm sign-up, password reset, email
 * change, log-in link) through Resend's API.
 *
 * Supabase calls this function instead of sending the email itself. That is
 * the "Send Email" auth hook (Authentication → Hooks in the dashboard). Why:
 *   - Resend's API is faster and more reliable than Supabase's SMTP path, and
 *     every email shows up in Resend → Emails with a delivered/bounced status.
 *   - The templates live here in code, so nothing has to be pasted into the
 *     dashboard and they cannot drift.
 *   - Every attempt is written to public.auth_email_log (sent or failed, with
 *     the reason), so a "never got the email" report can be checked in
 *     seconds from Supabase → Table Editor → auth_email_log.
 *   - If sending fails we answer with an error, so the person sees "could not
 *     send" on the sign-up page instead of waiting for an email that never
 *     comes.
 *
 * Self-contained so it can be pasted into the Supabase dashboard. Secrets:
 * SEND_EMAIL_HOOK_SECRET (from the hook page), RESEND_API_KEY, EMAIL_FROM,
 * SITE_URL. Deploy with "Verify JWT" OFF; the hook signature is the auth.
 */
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BRAND = 'Independent Journey';
const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'https://independentjourney.com').replace(/\/$/, '');
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type HookPayload = {
  user: { id: string; email: string; new_email?: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type: string;
    site_url?: string;
    old_email?: string;
  };
};

type Mail = { to: string; subject: string; html: string; text: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1. Check that the request really comes from Supabase Auth.
  const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  if (!hookSecret) return json({ error: 'SEND_EMAIL_HOOK_SECRET is missing.' }, 500);
  const raw = await req.text();
  let payload: HookPayload;
  try {
    payload = new Webhook(hookSecret).verify(raw, Object.fromEntries(req.headers)) as HookPayload;
  } catch (e) {
    console.error('bad signature', e);
    return json({ error: { http_code: 401, message: 'Invalid signature' } }, 401);
  }

  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const from = Deno.env.get('EMAIL_FROM') ?? '';
  if (!apiKey.startsWith('re_') || !from) return json({ error: { http_code: 500, message: 'RESEND_API_KEY or EMAIL_FROM is missing.' } }, 500);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { user, email_data: d } = payload;
  const action = d.email_action_type;

  // 2. Build the email(s) for this action.
  let mails: Mail[];
  try {
    mails = build(user, d);
  } catch (e) {
    console.error('build failed', action, e);
    return json({ error: { http_code: 500, message: String(e) } }, 500);
  }
  if (!mails.length) {
    await log(db, user, user.email, action, 'skipped', null, 'No template for this email type.');
    return json({});
  }

  // 3. Send through Resend and record each attempt.
  for (const m of mails) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: { 'X-Entity-Ref-ID': crypto.randomUUID() } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
      await log(db, user, m.to, action, 'sent', body?.id ?? null, null);
    } catch (e) {
      console.error('send failed', action, m.to, e);
      await log(db, user, m.to, action, 'failed', null, String(e).slice(0, 500));
      // Telling Supabase about the failure makes the sign-up / reset form show an error.
      return json({ error: { http_code: 500, message: 'We could not send the email right now. Please try again in a minute.' } }, 500);
    }
  }
  return json({});
});

async function log(db: ReturnType<typeof createClient>, user: HookPayload['user'], to: string, action: string, status: string, providerId: string | null, error: string | null) {
  const { error: err } = await db.from('auth_email_log').insert({ user_id: user.id, email: to, action, status, provider_id: providerId, error });
  if (err) console.error('log insert failed', err.message); // never fail the email over logging
}

// ---------------------------------------------------------------------------
// Which email to send for each action type.
// ---------------------------------------------------------------------------
function build(user: HookPayload['user'], d: HookPayload['email_data']): Mail[] {
  const site = siteUrl();
  const link = (hash: string, type: string) => `${site}/confirm?token_hash=${encodeURIComponent(hash)}&type=${type}`;

  switch (d.email_action_type) {
    case 'signup':
    case 'invite':
      return [
        render(user.email, {
          subject: `Welcome to ${BRAND}: confirm your email`,
          preheader: `Your code is ${d.token}. Confirm your email to finish setting up your account.`,
          heading: `Welcome to ${BRAND}`,
          // This is also the welcome email (there is no separate one any more).
          intro: `Thanks for joining. ${welcomeLine(user)} First, please confirm this email address so we know it is yours.`,
          button: 'Confirm my email',
          link: link(d.token_hash, d.email_action_type),
          codeIntro: 'Or type this code on the page you just left:',
          code: d.token,
          closing: `The button and code work once and expire in one hour. After that, the best next step is to finish your profile so other members can get to know you. ${BRAND} is an introduction platform, not an agency. We never handle money between members or give medical or legal advice.`,
          why: 'You received this email because someone signed up at independentjourney.com with this address. If it was not you, you can ignore it and no account will be activated.',
        }),
      ];

    case 'recovery':
      return [
        render(user.email, {
          subject: `Reset your ${BRAND} password`,
          preheader: `Your code is ${d.token}. Use it or the button to choose a new password.`,
          heading: 'Reset your password',
          intro: 'Someone asked to reset the password for this email address. If that was you, click the button to choose a new password.',
          button: 'Choose a new password',
          link: link(d.token_hash, 'recovery'),
          codeIntro: 'Or type this code on the password reset page:',
          code: d.token,
          closing: 'The button and code work once and expire in one hour. If you did not ask for this, you can ignore this email; your password stays the same.',
          why: 'You received this email because a password reset was requested at independentjourney.com for this address.',
        }),
      ];

    case 'magiclink':
    case 'email':
      return [
        render(user.email, {
          subject: `Your ${BRAND} log-in link`,
          preheader: `Your code is ${d.token}. Use it or the button to log in.`,
          heading: `Log in to ${BRAND}`,
          intro: 'Click the button to log in. No password needed.',
          button: 'Log me in',
          link: link(d.token_hash, d.email_action_type === 'email' ? 'email' : 'magiclink'),
          codeIntro: 'Or type this code on the log-in page:',
          code: d.token,
          closing: 'The button and code work once and expire in one hour. If you did not ask for this, you can ignore this email.',
          why: 'You received this email because a log-in link was requested at independentjourney.com for this address.',
        }),
      ];

    case 'email_change': {
      // Supabase's naming is backwards here, on purpose (kept for compatibility):
      //   token_hash + token_new  -> the NEW address
      //   token_hash_new + token  -> the CURRENT address (only with "secure email change")
      const oldEmail = user.email;
      const newEmail = user.new_email ?? '';
      const common = {
        subject: `Confirm your new email for ${BRAND}`,
        heading: 'Confirm your new email address',
        button: 'Confirm new email',
        closing: 'The button works once and expires in one hour. If you did not ask for this, log in and check your account settings.',
        why: 'You received this email because an email change was requested at independentjourney.com.',
      };
      const mails: Mail[] = [];
      if (newEmail) {
        mails.push(
          render(newEmail, {
            ...common,
            preheader: 'Confirm the new email address for your account.',
            intro: `You asked to change the email on your ${BRAND} account from ${esc(oldEmail)} to ${esc(newEmail)}. Click the button to confirm the new address.`,
            link: link(d.token_hash, 'email_change'),
          }),
        );
      }
      if (d.token_hash_new) {
        mails.push(
          render(oldEmail, {
            ...common,
            subject: `Confirm the email change on your ${BRAND} account`,
            preheader: 'Approve moving your account to a new email address.',
            intro: `You asked to change the email on your ${BRAND} account from ${esc(oldEmail)} to ${esc(newEmail)}. Click the button to approve the change from this address too.`,
            link: link(d.token_hash_new, 'email_change'),
          }),
        );
      }
      return mails;
    }

    case 'reauthentication':
      return [
        render(user.email, {
          subject: `Your ${BRAND} verification code`,
          preheader: `Your code is ${d.token}.`,
          heading: 'Your verification code',
          intro: 'Type this code on the page you just left to continue.',
          codeIntro: '',
          code: d.token,
          closing: 'The code works once and expires in one hour. If you did not ask for this, you can ignore this email.',
          why: 'You received this email because a verification code was requested at independentjourney.com for this address.',
        }),
      ];

    case 'password_changed_notification':
      return [
        render(user.email, {
          subject: `Your ${BRAND} password was changed`,
          preheader: 'Your password was just changed.',
          heading: 'Your password was changed',
          intro: 'The password on your account was just changed. If that was you, there is nothing to do.',
          button: 'Reset my password',
          link: `${site}/forgot-password`,
          closing: 'If you did not change it, reset your password right away using the button above.',
          why: 'You received this email because the password on your independentjourney.com account changed.',
        }),
      ];

    case 'email_changed_notification':
      return [
        render(user.email, {
          subject: `Your ${BRAND} email address was changed`,
          preheader: 'The email on your account was just changed.',
          heading: 'Your email address was changed',
          intro: `The email on your account was changed${d.old_email ? ` from ${esc(d.old_email)}` : ''}. If that was you, there is nothing to do.`,
          button: 'Review my account',
          link: `${site}/settings`,
          closing: 'If you did not make this change, log in and check your account settings, or write to us.',
          why: 'You received this email because the email on your independentjourney.com account changed.',
        }),
      ];

    default:
      return []; // other notifications are not sent today
  }
}

// ---------------------------------------------------------------------------
// One layout for every login email: table-based so it renders in Outlook and
// Gmail, a bulletproof button, a preview line, and a plain-text version.
// ---------------------------------------------------------------------------
/** One sentence of welcome that fits the kind of account being created. */
function welcomeLine(user: HookPayload['user']): string {
  const role = String(user.user_metadata?.role ?? '');
  if (role === 'surrogate') return 'Surrogates are always free here.';
  if (role === 'intended_parent') return 'You can browse profiles for free.';
  if (role === 'agency') return 'Once your agency details are filled in, you can post profiles for the clients you represent.';
  return 'We are glad you are here.';
}

type Parts = {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  button?: string;
  link?: string;
  codeIntro?: string;
  code?: string;
  closing: string;
  why: string;
};

function render(to: string, p: Parts): Mail {
  const site = siteUrl();
  const serif = "font-family:Georgia,'Times New Roman',serif";
  const button =
    p.button && p.link
      ? `<tr><td align="center" style="padding:4px 0 24px">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${p.link}" style="height:48px;v-text-anchor:middle;width:260px" arcsize="22%" fillcolor="#8C6E57" stroke="f">
                <w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${p.button}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                <td align="center" bgcolor="#8C6E57" style="background:#8C6E57;border-radius:10px">
                  <a href="${p.link}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px">${p.button}</a>
                </td>
              </tr></table>
              <!--<![endif]-->
            </td></tr>`
      : '';
  const code = p.code
    ? `${p.codeIntro ? `<tr><td style="padding:8px 0 20px;${serif};font-size:16px;line-height:24px;color:#2E2A26">${p.codeIntro}</td></tr>` : ''}
            <tr><td align="center" style="padding:0 0 24px">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                <td align="center" bgcolor="#F8F5EF" style="background:#F8F5EF;border:1px solid #E8E1D6;border-radius:10px;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:30px;letter-spacing:8px;font-weight:bold;color:#2E2A26">${p.code}</td>
              </tr></table>
            </td></tr>`
    : '';
  const fallback = p.link
    ? `<tr><td style="${serif};font-size:13px;line-height:20px;color:#6E6760;border-top:1px solid #E8E1D6;padding:16px 0 0">If the button does not work, copy this address into your browser:<br><a href="${p.link}" style="color:#8C6E57;word-break:break-all">${p.link}</a></td></tr>`
    : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${p.subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    a { color:#8C6E57; }
    @media only screen and (max-width:620px) { .wrap { width:100% !important; } .pad { padding:24px 20px !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background:#F8F5EF">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F8F5EF;opacity:0">${p.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8F5EF" style="background:#F8F5EF">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" class="wrap" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px">
        <tr><td align="left" style="padding:0 4px 18px">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td valign="middle" style="padding-right:12px"><img src="${site}/logo-192.png" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></td>
            <td valign="middle" style="${serif};font-size:22px;color:#8C6E57;letter-spacing:.2px">${BRAND}</td>
          </tr></table>
        </td></tr>
        <tr><td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E8E1D6;border-radius:16px;padding:32px 36px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="${serif};font-size:24px;line-height:32px;color:#2E2A26;padding:0 0 16px">${p.heading}</td></tr>
            <tr><td style="${serif};font-size:16px;line-height:24px;color:#2E2A26;padding:0 0 20px">${p.intro}</td></tr>
            ${button}
            ${code}
            <tr><td style="${serif};font-size:14px;line-height:22px;color:#6E6760;padding:0 0 12px">${p.closing}</td></tr>
            ${fallback}
          </table>
        </td></tr>
        <tr><td style="padding:20px 8px 0;${serif};font-size:12px;line-height:18px;color:#6E6760">
          ${p.why}<br>
          ${BRAND} &middot; <a href="${site}" style="color:#6E6760">independentjourney.com</a> &middot; <a href="${site}/privacy" style="color:#6E6760">Privacy</a><br>
          An introduction platform for intended parents and gestational surrogates. Not an agency; no medical or legal advice.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    p.heading,
    '',
    strip(p.intro),
    p.link ? `\n${p.button}: ${p.link}` : '',
    p.code ? `\n${p.codeIntro || 'Your code:'} ${p.code}` : '',
    '',
    strip(p.closing),
    '',
    strip(p.why),
    `${BRAND} · ${site}`,
  ].join('\n');

  return { to, subject: p.subject, html, text };
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function strip(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
