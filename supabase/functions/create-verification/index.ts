/**
 * create-verification: starts a Stripe Identity session (government ID plus
 * a live selfie) for the signed-in member and returns Stripe's URL.
 *
 * Free for members; we pay Stripe per completed check. The result comes back
 * through stripe-webhook, which marks the profile Verified. We never see or
 * store the ID images; Stripe keeps them.
 *
 * Self-contained so it can be pasted into the Supabase dashboard. Secrets:
 * STRIPE_SECRET_KEY and SITE_URL.
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
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Please log in first.' }, 401);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await db.from('profiles').select('is_verified, banned_at').eq('id', user.id).single();
    if (!profile) return json({ error: 'Finish creating your account first.' }, 400);
    if (profile.is_verified) return json({ error: 'You are already verified.' }, 400);
    if (profile.banned_at) return json({ error: 'This account cannot be verified.' }, 403);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });

    // Reuse a session the member started in the last hour instead of paying twice.
    const { data: recent } = await db.from('identity_checks').select('id, status, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (recent && recent.status === 'created' && Date.now() - new Date(recent.created_at).getTime() < 60 * 60 * 1000) {
      const existing = await stripe.identity.verificationSessions.retrieve(recent.id);
      if (existing.status === 'requires_input' && existing.url) return json({ url: existing.url });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { user_id: user.id },
      options: { document: { require_matching_selfie: true, require_live_capture: true } },
      return_url: `${siteUrl()}/home?verify=returned`,
    });
    await db.rpc('record_identity_check', { p_user: user.id, p_session_id: session.id });
    return json({ url: session.url });
  } catch (e) {
    console.error('create-verification failed', e);
    return json({ error: 'Could not start verification. Please try again in a moment.' }, 500);
  }
});
