/**
 * create-checkout: starts a Stripe Checkout session for the signed-in
 * intended parent and returns the URL of Stripe's payment page.
 *
 * Price and term come from app_settings (never hardcoded). The purchase is a
 * single charge for one term; the membership is granted by stripe-webhook
 * once Stripe confirms payment.
 *
 * Runs on Supabase's servers (Deno). Secrets come from Edge Function secrets:
 * STRIPE_SECRET_KEY and SITE_URL. The Supabase URL and keys are provided
 * automatically. This file is self-contained so it can be pasted into the
 * Supabase dashboard as one function.
 */
import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'https://independentjourney.com').replace(/\/$/, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // Who is asking? Use their login token so RLS applies.
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Please log in first.' }, 401);

    // Server-side checks with the service role (bypasses RLS, never shipped to browsers).
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await db.from('profiles').select('role, banned_at').eq('id', user.id).single();
    if (!profile) return json({ error: 'Finish creating your account first.' }, 400);
    if (profile.role !== 'intended_parent') return json({ error: 'Surrogates are always free. No membership is needed.' }, 400);
    if (profile.banned_at) return json({ error: 'This account cannot purchase a membership.' }, 403);

    const { data: settings } = await db.from('app_settings').select('key, value').in('key', ['membership_price_usd', 'membership_term_months']);
    const setting = (k: string, d: number) => Number(settings?.find((s) => s.key === k)?.value ?? d);
    const priceUsd = setting('membership_price_usd', 199);
    const termMonths = setting('membership_term_months', 3);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id, term_months: String(termMonths) },
      payment_intent_data: { metadata: { user_id: user.id } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(priceUsd * 100),
          product_data: {
            name: `Independent Journey membership · ${termMonths} months`,
            description: 'Full surrogate profiles and messaging for one term. One-time charge, no automatic renewal.',
          },
        },
      }],
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/membership?status=success`,
      cancel_url: `${siteUrl()}/membership?status=cancelled`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('create-checkout failed', e);
    return json({ error: 'Could not start checkout. Please try again in a moment.' }, 500);
  }
});
