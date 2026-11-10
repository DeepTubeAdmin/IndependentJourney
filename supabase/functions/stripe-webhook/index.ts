/**
 * stripe-webhook: Stripe calls this URL when something happens. We check the
 * signature (so only Stripe can call it), then hand the event to the
 * database functions, which ignore repeats.
 *
 * In the Supabase dashboard this function must have "Verify JWT" turned OFF,
 * because Stripe does not send a Supabase login token. The Stripe signature
 * is the protection instead. Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 *
 * Events handled:
 *   checkout.session.completed           -> start or extend a membership
 *   charge.refunded                      -> cancel the membership that charge bought
 *   identity.verification_session.*      -> record the ID-check result
 */
import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return json({ error: 'Missing webhook secret or signature' }, 400);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    console.error('Bad Stripe signature', e);
    return json({ error: 'Bad signature' }, 400);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id ?? null);
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id ?? s.client_reference_id;
        if (s.payment_status !== 'paid' || !userId) break;
        const { data, error } = await db.rpc('apply_stripe_payment', {
          p_event_id: event.id,
          p_user: userId,
          p_payment_intent: idOf(s.payment_intent),
          p_customer: idOf(s.customer),
          p_amount_cents: s.amount_total ?? 0,
        });
        if (error) throw error;
        console.log('membership', data);
        break;
      }
      case 'charge.refunded': {
        const c = event.data.object as Stripe.Charge;
        const pi = idOf(c.payment_intent);
        if (!pi) break;
        const { error } = await db.rpc('record_stripe_refund', { p_event_id: event.id, p_payment_intent: pi });
        if (error) throw error;
        break;
      }
      case 'identity.verification_session.verified':
      case 'identity.verification_session.processing':
      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.canceled': {
        const v = event.data.object as Stripe.Identity.VerificationSession;
        const status = event.type.split('.').pop()!; // verified | processing | requires_input | canceled
        const { error } = await db.rpc('apply_identity_result', {
          p_event_id: event.id,
          p_session_id: v.id,
          p_status: status,
          p_error: v.last_error?.reason ?? v.last_error?.code ?? null,
        });
        if (error) throw error;
        break;
      }
      default:
        // Other events are fine to ignore; Stripe only needs a 200.
        break;
    }
  } catch (e) {
    console.error(`Webhook ${event.type} failed`, e);
    // A non-200 makes Stripe retry later, which is what we want.
    return json({ error: 'Processing failed' }, 500);
  }
  return json({ received: true });
});
