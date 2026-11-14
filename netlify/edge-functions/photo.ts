/**
 * photo: cached member photos at /photos/<member id>/<file>.
 *
 * Why this exists: the website used to ask Supabase for a brand-new signed
 * photo link on every page view. Each link was different and expired after 30
 * minutes, so browsers could never reuse a photo they had already downloaded,
 * and every visit to the homepage or Browse pulled every photo again from
 * Supabase. That burned through the free plan's 5 GB/month of egress with
 * almost no traffic.
 *
 * Now the website shows photos through this address instead. The first request
 * for a photo fetches it from Supabase once, using the public (anon) key, so
 * Supabase's own rule still applies: only photos of LIVE profiles can be read
 * (see photo_is_previewable in the migrations). Netlify's CDN then keeps a copy
 * for a week and the browser keeps one for a day, so repeat views cost
 * Supabase nothing. File names contain an upload timestamp and never change,
 * which makes long caching safe. A deleted photo can linger in the CDN for up
 * to a week at its old, unguessable address.
 *
 * Photos that are not public (a member editing their own not-yet-live
 * profile, the admin dashboard) still use short-lived signed links.
 */

// "<uuid>/<file name>" only. Anything else is a 404 without touching Supabase.
const PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,120}$/i;

const BROWSER_CACHE = 'public, max-age=86400'; // 1 day in the visitor's browser
const CDN_CACHE = 'public, durable, max-age=604800'; // 7 days on Netlify's CDN

/** Supabase address and public key, from the same variables the website build uses. */
function supabase(): { url: string; key: string } | null {
  const env = (globalThis as any).Netlify?.env;
  const url = (env?.get('EXPO_PUBLIC_SUPABASE_URL') ?? '').trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const key = (env?.get('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '').trim().replace(/^["']|["']$/g, '');
  return url && key ? { url, key } : null;
}

const notFound = () =>
  new Response('Not found', {
    status: 404,
    // Short cache only: a profile that goes live a minute later should show its photos.
    headers: { 'Cache-Control': 'public, max-age=60', 'Netlify-CDN-Cache-Control': 'public, max-age=60' },
  });

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = decodeURIComponent(url.pathname.replace(/^\/photos\//, ''));
  if (!PATH.test(path)) return notFound();

  const sb = supabase();
  if (!sb) return notFound();

  const file = await fetch(`${sb.url}/storage/v1/object/authenticated/profile-photos/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` },
  });
  if (!file.ok || !file.body) return notFound();

  return new Response(file.body, {
    status: 200,
    headers: {
      'Content-Type': file.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': BROWSER_CACHE,
      'Netlify-CDN-Cache-Control': CDN_CACHE,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
};

export const config = { path: '/photos/*', cache: 'manual' };
