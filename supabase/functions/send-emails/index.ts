/**
 * send-emails: delivers queued emails through Resend.
 *
 * Runs on a schedule (every 5 minutes, see docs/RESEND_SETUP.md). Each run:
 *   1. asks the database to queue any due reminders (membership ending or
 *      ended, verification nudges, saved-search alerts),
 *   2. claims up to 50 queued emails,
 *   3. renders and sends each one, and marks it sent or failed.
 * Emails are queued by database triggers (new message, receipt, ID-check
 * result, welcome), so this function never decides *who* to email.
 *
 * Self-contained so it can be pasted into the Supabase dashboard. Secrets:
 * RESEND_API_KEY, EMAIL_FROM, CRON_SECRET, SITE_URL.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_NAME = 'Independent Journey';
const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'https://independentjourney.com').replace(/\/$/, '');
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Row = { id: number; user_id: string; email: string; display_name: string; template: string; payload: Record<string, any>; attempts: number };

Deno.serve(async (req) => {
  // Only the scheduler (or you, with the secret) may trigger a run.
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Forbidden' }, 403);

  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const from = Deno.env.get('EMAIL_FROM') ?? '';
  if (!apiKey.startsWith('re_') || !from) return json({ error: 'RESEND_API_KEY (starts with re_) or EMAIL_FROM is missing.' }, 500);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Queue anything that is due today.
  const due: Record<string, number> = {};
  for (const fn of ['enqueue_membership_reminders', 'enqueue_verify_nudges', 'run_saved_search_alerts']) {
    const { data, error } = await db.rpc(fn);
    if (error) console.error(fn, error.message);
    due[fn] = Number(data ?? 0);
  }

  // 2. Claim a batch.
  const { data: rows, error } = await db.rpc('claim_emails', { p_limit: 50 });
  if (error) return json({ error: error.message }, 500);

  // 3. Send each one.
  let sent = 0, failed = 0;
  for (const row of (rows ?? []) as Row[]) {
    try {
      const msg = render(row);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [row.email], subject: msg.subject, html: layout(msg.subject, msg.body), text: msg.text }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await db.rpc('mark_email', { p_id: row.id, p_ok: true, p_error: null });
      sent++;
    } catch (e) {
      console.error('send failed', row.id, row.template, e);
      await db.rpc('mark_email', { p_id: row.id, p_ok: false, p_error: String(e).slice(0, 500) });
      failed++;
    }
  }
  return json({ ok: true, queued_today: due, sent, failed });
});

// ---------------------------------------------------------------------------
// Templates. Keep them short and plain; links go to the site, never to Stripe.
// ---------------------------------------------------------------------------
function render(row: Row): { subject: string; body: string; text: string } {
  const p = row.payload ?? {};
  const first = esc((row.display_name || 'there').split(' ')[0]);
  const url = siteUrl();
  const btn = (href: string, label: string) =>
    `<p style="margin:24px 0"><a href="${href}" style="background:#7A5C44;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${label}</a></p>`;
  const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');

  switch (row.template) {
    case 'welcome': {
      const sur = p.role === 'surrogate';
      return msg(`Welcome to ${SITE_NAME}`,
        `<p>Hi ${first},</p><p>Thanks for joining. ${sur ? 'Surrogates are always free here.' : 'You can browse previews for free and read full profiles with a membership.'} The best next step is to finish your profile so other members can get to know you, then verify your identity (free, about two minutes).</p>${btn(`${url}/home`, 'Finish my profile')}<p>Independent Journey is an introduction platform, not an agency. We never handle money between members or give medical or legal advice.</p>`,
        `Hi ${first}, thanks for joining ${SITE_NAME}. Finish your profile at ${url}/home`);
    }
    case 'new_message': {
      const who = esc(p.sender_name ?? 'A member');
      // Agency-posted senders are named with their agency; a managed recipient's agency is told which client it is for.
      const via = p.sender_agency ? ` (posted by ${esc(p.sender_agency)})` : '';
      const forWhom = p.for_name ? `<p>This message is for your client <strong>${esc(p.for_name)}</strong>.</p>` : '';
      return msg(`${who} sent you a message`,
        `<p>Hi ${first},</p>${forWhom}<p><strong>${who}</strong>${p.sender_state ? ` (${esc(p.sender_state)})` : ''}${p.sender_verified ? ', Verified,' : ''}${via} wrote to you:</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #B8CFE0;color:#444">${esc(p.preview ?? '')}${(p.preview ?? '').length >= 140 ? '…' : ''}</blockquote>${btn(`${url}/messages/${p.conversation_id}`, 'Read and reply')}<p style="color:#777;font-size:13px">We send at most one email per conversation per hour.</p>`,
        `${who} sent you a message on ${SITE_NAME}. Read it at ${url}/messages/${p.conversation_id}`);
    }
    case 'locked_message': {
      const who = esc(p.sender_name ?? 'A surrogate');
      return msg(`${who} sent you a message`,
        `<p>Hi ${first},</p><p><strong>${who}</strong>${p.sender_state ? ` from ${esc(p.sender_state)}` : ''}${p.sender_agency ? ` (posted by ${esc(p.sender_agency)})` : ''} has written to you. A membership lets you read it and reply.</p>${btn(`${url}/membership`, 'See membership options')}`,
        `${who} sent you a message on ${SITE_NAME}. A membership lets you read and reply: ${url}/membership`);
    }
    case 'membership_receipt':
      return msg(`Your ${SITE_NAME} membership receipt`,
        `<p>Hi ${first},</p><p>Thank you. Your payment of <strong>$${Number(p.price_usd ?? 0)}</strong> for a ${p.term_months}-month membership went through. It runs until <strong>${date(p.period_end)}</strong>. There is no automatic renewal; we will remind you a week before it ends.</p>${btn(`${url}/browse`, 'Browse surrogates')}<p style="color:#777;font-size:13px">Stripe also emails you a card receipt. Keep this for your records.</p>`,
        `Your $${Number(p.price_usd ?? 0)} ${SITE_NAME} membership runs until ${date(p.period_end)}.`);
    case 'membership_ending':
      return msg('Your membership ends in a week',
        `<p>Hi ${first},</p><p>Your membership ends on <strong>${date(p.period_end)}</strong>. Nothing renews automatically. If you would like to keep reading full profiles and messaging, you can extend it now and the new term is added on top of your current one.</p>${btn(`${url}/membership`, `Extend for $${Number(p.price_usd ?? 0)}`)}`,
        `Your ${SITE_NAME} membership ends on ${date(p.period_end)}. Extend at ${url}/membership`);
    case 'membership_ended':
      return msg('Your membership has ended',
        `<p>Hi ${first},</p><p>Your membership ended on ${date(p.period_end)}. Your profile, saved profiles and conversations are all still here. New messages from surrogates will wait for you, and a new membership opens them again.</p>${btn(`${url}/membership`, 'See membership options')}`,
        `Your ${SITE_NAME} membership has ended. See options at ${url}/membership`);
    case 'identity_verified':
      return msg('You are verified',
        `<p>Hi ${first},</p><p>Your identity check passed. Your profile now shows a <strong>Verified</strong> label, which members tell us is the first thing they look for.</p>${btn(`${url}/home`, 'View my profile')}`,
        `Your identity check passed. Your ${SITE_NAME} profile now shows Verified.`);
    case 'identity_failed':
      return msg('We could not verify your ID',
        `<p>Hi ${first},</p><p>The identity check could not confirm your document${p.reason ? ` (${esc(p.reason)})` : ''}. This is usually a blurry photo or glare. You can try again any time; it is still free.</p>${btn(`${url}/home`, 'Try again')}`,
        `We could not verify your ID. Try again at ${url}/home`);
    case 'verify_nudge':
      return msg('A free two-minute step that helps most',
        `<p>Hi ${first},</p><p>Your profile is complete, nice work. Members contact verified profiles far more often, and verification is free: a photo of your ID and a selfie, checked by Stripe. We never see or store the images.</p>${btn(`${url}/home`, 'Verify my identity')}`,
        `Verify your identity for free at ${url}/home`);
    case 'saved_search': {
      const items: any[] = Array.isArray(p.items) ? p.items : [];
      const list = items.map((i) =>
        `<li style="margin:6px 0"><a href="${url}/profile/${i.id}" style="color:#7A5C44;font-weight:600">${esc(i.display_name)}</a> · ${esc(i.state ?? '')}${i.is_verified ? ' · Verified' : ''}${i.headline ? `<br><span style="color:#666">${esc(i.headline)}</span>` : ''}</li>`).join('');
      const n = Number(p.count ?? items.length);
      return msg(`${n} new ${n === 1 ? 'profile matches' : 'profiles match'} “${esc(p.search_name ?? 'your search')}”`,
        `<p>Hi ${first},</p><p>New or updated profiles match your saved search <strong>${esc(p.search_name ?? '')}</strong>:</p><ul style="padding-left:18px">${list}</ul>${n > items.length ? `<p>…and ${n - items.length} more.</p>` : ''}${btn(`${url}/browse`, 'Browse now')}<p style="color:#777;font-size:13px">Turn alerts off for this search under Settings.</p>`,
        `${n} new profiles match your saved search "${p.search_name ?? ''}" on ${SITE_NAME}. Browse at ${url}/browse`);
    }
    // ----- Agency accounts (migration 23) -----
    case 'agency_welcome':
      return msg(`Welcome to ${SITE_NAME}`,
        `<p>Hi ${first},</p><p>Thanks for applying for an agency account for <strong>${esc(p.agency_name ?? 'your agency')}</strong>. Next, finish your agency details (states, services, typical fee ranges). We review every agency by hand and email you when you are approved, usually within a few days. After that you can post profiles for the clients you represent.</p>${btn(`${url}/agency`, 'Finish agency details')}<p>Agency accounts are free during our beta. Independent Journey is an introduction platform: we do not match, screen or manage journeys.</p>`,
        `Thanks for applying for an agency account. Finish your details at ${url}/agency and we will review it by hand.`);
    case 'agency_pending':
      return msg(`New agency to review: ${esc(p.agency_name ?? '')}`,
        `<p>A new agency has signed up and is waiting for your approval.</p><p><strong>${esc(p.agency_name ?? '')}</strong><br>Website: ${esc(p.website ?? '')}<br>Contact: ${esc(p.contact_name ?? '')}</p>${btn(`${url}/admin/agencies?id=${p.agency_id}`, 'Review in admin')}<p style="color:#777;font-size:13px">You will get a second email once they have finished their agency details.</p>`,
        `New agency waiting for approval: ${p.agency_name ?? ''} (${p.website ?? ''}). Review at ${url}/admin/agencies?id=${p.agency_id}`);
    case 'agency_ready':
      return msg(`Agency ready to approve: ${esc(p.agency_name ?? '')}`,
        `<p><strong>${esc(p.agency_name ?? '')}</strong> has finished its agency details and is ready for your review.</p><p>Website: ${esc(p.website ?? '')}<br>Contact: ${esc(p.contact_name ?? '')}</p>${btn(`${url}/admin/agencies?id=${p.agency_id}`, 'Approve or reject')}`,
        `${p.agency_name ?? ''} finished its agency details. Approve or reject at ${url}/admin/agencies?id=${p.agency_id}`);
    case 'agency_approved':
      return msg('Your agency is approved',
        `<p>Hi ${first},</p><p><strong>${esc(p.agency_name ?? 'Your agency')}</strong> is approved. You can now post profiles for the surrogates and intended parents you represent. Each profile uses the same questionnaire as independent members, is labelled with your agency name, and messages to it come to you.</p>${btn(`${url}/agency`, 'Open agency dashboard')}<p>Please only list clients who have agreed in writing to be shown here, and keep their profiles current.</p>`,
        `Your agency is approved. Post client profiles at ${url}/agency`);
    case 'agency_rejected':
      return msg('About your agency application',
        `<p>Hi ${first},</p><p>We were not able to approve <strong>${esc(p.agency_name ?? 'your agency')}</strong> at this time.${p.note ? ` Our note: <em>${esc(p.note)}</em>` : ''}</p><p>If you think this is a mistake, reply to this email and we will take another look.</p>`,
        `We were not able to approve your agency application.${p.note ? ` Note: ${p.note}` : ''} Reply to this email if you think this is a mistake.`);
    case 'agency_suspended':
      return msg('Your agency account is suspended',
        `<p>Hi ${first},</p><p><strong>${esc(p.agency_name ?? 'Your agency')}</strong> has been suspended and its client profiles are hidden.${p.note ? ` Our note: <em>${esc(p.note)}</em>` : ''}</p><p>Reply to this email if you would like to discuss it.</p>`,
        `Your agency account is suspended and its profiles are hidden.${p.note ? ` Note: ${p.note}` : ''}`);
    default:
      return msg(`Update from ${SITE_NAME}`, `<p>Hi ${first},</p><p>There is an update waiting for you.</p>${btn(`${url}/home`, 'Open Independent Journey')}`, `There is an update for you at ${url}/home`);
  }
}

const msg = (subject: string, body: string, text: string) => ({ subject, body, text });

/** Brand wrapper (Linen & Sky: warm off-white, gentle brown, pale blue). */
function layout(title: string, body: string): string {
  const url = siteUrl();
  return `<!doctype html><html><body style="margin:0;background:#F7F3EE;font-family:Georgia,'Times New Roman',serif;color:#2B2622">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="font-size:20px;margin:0 0 20px;color:#7A5C44;letter-spacing:.2px">${SITE_NAME}</p>
  <div style="background:#fff;border:1px solid #E6DED5;border-radius:14px;padding:28px 28px 20px;font-size:16px;line-height:1.55">
    <h1 style="font-size:22px;margin:0 0 16px;font-weight:600">${title}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#8A817A;line-height:1.5;margin-top:20px">You are receiving this because you have an account at <a href="${url}" style="color:#8A817A">independentjourney.com</a>. Change which emails you get under <a href="${url}/settings" style="color:#8A817A">Settings</a>. Independent Journey is an introduction platform, not an agency, and does not give medical or legal advice.</p>
</div></body></html>`;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
