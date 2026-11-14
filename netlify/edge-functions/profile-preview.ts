/**
 * profile-preview: rich link previews for profile links (/profile/<id>).
 *
 * When someone pastes https://independentjourney.com/profile/<id> into
 * Facebook, iMessage, WhatsApp or X, that app fetches the page without
 * running our JavaScript, so it only ever saw "independentjourney.com". This
 * Netlify Edge Function runs in front of every /profile/* request:
 *
 *   - a link-preview crawler gets a tiny HTML page whose Open Graph tags carry
 *     the member's first photo, name, state, role and headline tags: the same
 *     information as the homepage card;
 *   - the preview image is the member's first photo at /photos/<path>, a cached
 *     address on our own domain (see photo.ts);
 *   - everyone else is passed straight through to the normal page.
 *
 * It uses only what a visitor can already see: the public browse_profiles()
 * function and the preview-photo storage rule, with the site's public
 * (anon) key. No secrets. Netlify's free tier includes edge functions, and
 * nothing here needs clicking: the function deploys with the site.
 * The /s/<token> share links keep using the Supabase share-preview function.
 */

// Apps that fetch links to draw a preview card. Everyone else is a person.
const CRAWLER = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|embedly|skypeuripreview|snapchat|vkshare|applebot|googlebot|bingbot|duckduckbot|iframely|quora link preview|outbrain|w3c_validator|nuzzel|bitlybot|tumblr|yahoo|flipboard|preview/i;
const SITE_NAME = 'Independent Journey';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  role: 'surrogate' | 'intended_parent';
  display_name: string;
  state: string;
  is_verified: boolean;
  headline_tags: string[] | null;
  preview_photo_path: string | null;
  profile_type?: string | null;
  agency_name?: string | null;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' } });

/** Supabase address and public key, from the same variables the website build uses. */
function supabase(): { url: string; key: string } | null {
  const env = (globalThis as any).Netlify?.env;
  const url = (env?.get('EXPO_PUBLIC_SUPABASE_URL') ?? '').trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const key = (env?.get('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '').trim().replace(/^["']|["']$/g, '');
  return url && key ? { url, key } : null;
}

/** The limited preview of one live profile, exactly what the browse page shows. */
async function loadRow(sb: { url: string; key: string }, id: string): Promise<Row | null> {
  const res = await fetch(`${sb.url}/rest/v1/rpc/browse_profiles`, {
    method: 'POST',
    headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_filters: { id }, p_limit: 1, p_offset: 0 }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows?.[0] ?? null;
}

/** The Open Graph card. Mirrors the homepage card: photo, name · state · role, type, verified, highlights. */
export function card(row: Row | null, id: string, origin: string): string {
  if (!row) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${SITE_NAME}</title>
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="This profile is not available">
<meta property="og:description" content="The member may have paused their profile. Independent Journey is where intended parents and surrogates find each other, independently or with an agency.">
<meta property="og:image" content="${origin}/og-image.png">
<meta property="og:url" content="${origin}/profile/${esc(id)}">
<meta name="twitter:card" content="summary_large_image">
</head><body><p><a href="${origin}/profile/${esc(id)}">Open on ${SITE_NAME}</a></p></body></html>`;
  }
  const role = row.role === 'surrogate' ? 'Surrogate' : 'Intended parents';
  const roleLong = row.role === 'surrogate' ? 'Gestational surrogate' : 'Intended parents';
  const agency = row.profile_type === 'agency';
  const title = `${row.display_name} · ${row.state} · ${role}`;
  const bits: string[] = [roleLong];
  bits.push(agency ? (row.agency_name ? `Agency: ${row.agency_name}` : 'Agency') : 'Independent');
  if (row.is_verified && !agency) bits.push('Identity verified');
  for (const t of row.headline_tags ?? []) bits.push(t);
  const description = `${bits.join(' · ')}. See the full profile on ${SITE_NAME}.`;
  const pageUrl = `${origin}/profile/${row.id}`;
  const image = row.preview_photo_path ? `${origin}/photos/${row.preview_photo_path.split('/').map(encodeURIComponent).join('/')}` : `${origin}/og-image.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:alt" content="${esc(row.display_name)}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${pageUrl}">
</head><body>
<h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${pageUrl}">Open the profile</a></p>
</body></html>`;
}

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['profile', '<id>', 'photo'?]
  const id = parts[1] ?? '';
  const wantsPhoto = parts[2] === 'photo';
  const ua = req.headers.get('user-agent') ?? '';
  const isCrawler = CRAWLER.test(ua) || url.searchParams.get('preview') === '1';

  // Not a profile link, or a person opening the page: serve the website as usual.
  if (!UUID.test(id) || (!isCrawler && !wantsPhoto)) return context.next();

  const sb = supabase();
  if (!sb) return wantsPhoto ? Response.redirect(`${url.origin}/og-image.png`, 302) : context.next();

  const row = await loadRow(sb, id);

  // Older previews still point at /profile/<id>/photo: send them to the cached photo address.
  if (wantsPhoto) {
    const path = row?.preview_photo_path;
    const target = path ? `${url.origin}/photos/${path.split('/').map(encodeURIComponent).join('/')}` : `${url.origin}/og-image.png`;
    return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'public, max-age=3600' } });
  }

  return html(card(row, id, url.origin), row ? 200 : 404);
};
