/**
 * share-preview: rich link previews for share links (Facebook, iMessage,
 * WhatsApp, X, LinkedIn, Slack...).
 *
 * Those apps fetch a link without running our website's code, so the static
 * page only ever gave them the site name. Netlify forwards every request for
 * /s/<token> here (see scripts/write-redirects.js). This function:
 *   - for a link-preview crawler: returns a tiny HTML page whose Open Graph
 *     tags carry the member's first photo, name, state, role and highlights;
 *   - for a person: redirects straight to /share/<token>, the normal page;
 *   - for /s/<token>/photo: streams the first photo so the preview image has
 *     a stable address on our own domain.
 *
 * Only what share_view() already exposes is used (verified, live profiles
 * with an active share link). No secrets beyond the ones Supabase provides.
 * Self-contained so it can be pasted into the Supabase dashboard.
 * Optional secret: SITE_URL (defaults to https://independentjourney.com).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_NAME = 'Independent Journey';
const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'https://independentjourney.com').replace(/\/$/, '');

// Apps that fetch links to draw a preview card. Everyone else is a person.
const CRAWLER = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|embedly|skypeuripreview|snapchat|vkshare|applebot|googlebot|bingbot|duckduckbot|iframely|quora link preview|outbrain|w3c_validator|nuzzel|bitlybot|tumblr|yahoo|flipboard|preview/i;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const html = (body: string, status = 200, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex', ...extra } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Path is /share-preview/<token>[/photo] (the function name comes first).
  const parts = url.pathname.split('/').filter(Boolean);
  const token = parts[1] ?? '';
  const wantsPhoto = parts[2] === 'photo';
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return html('<!doctype html><title>Not found</title>Not found', 404);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: view } = await db.rpc('share_view', { p_token: token });
  const site = siteUrl();
  const pageUrl = `${site}/share/${token}`;

  // The first photo, served from our own domain so the preview image never expires.
  if (wantsPhoto) {
    const first = (view?.photos as string[] | undefined)?.[0];
    if (!first) return Response.redirect(`${site}/og-image.png`, 302);
    const { data: blob, error } = await db.storage.from('profile-photos').download(first);
    if (error || !blob) return Response.redirect(`${site}/og-image.png`, 302);
    return new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
  }

  const ua = req.headers.get('user-agent') ?? '';
  const isCrawler = CRAWLER.test(ua) || url.searchParams.get('preview') === '1';
  if (!isCrawler) return Response.redirect(pageUrl, 302);

  // Link no longer active: a plain card that still names the site.
  if (!view) {
    return html(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${SITE_NAME}</title>
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="This shared profile is no longer available">
<meta property="og:description" content="The member may have turned sharing off. Independent Journey is the no-agency way for intended parents and surrogates to find each other.">
<meta property="og:image" content="${site}/og-image.png">
<meta property="og:url" content="${site}/s/${esc(token)}">
<meta name="twitter:card" content="summary_large_image">
</head><body><p><a href="${pageUrl}">Open on ${SITE_NAME}</a></p></body></html>`);
  }

  const role = view.role === 'surrogate' ? 'Surrogate' : 'Intended parents';
  const roleLong = view.role === 'surrogate' ? 'Gestational surrogate' : 'Intended parents';
  const title = `${view.display_name} · ${view.state} · ${role}`;
  const bits: string[] = [roleLong];
  if (view.is_verified) bits.push('Identity verified');
  for (const t of (view.headline_tags ?? []) as string[]) bits.push(t);
  const description = `${bits.join(' · ')}. See the full shared profile on ${SITE_NAME}.`;
  const image = `${site}/s/${token}/photo`;

  return html(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:alt" content="${esc(view.display_name)}">
<meta property="og:url" content="${site}/s/${esc(token)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${pageUrl}">
</head><body>
<h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${pageUrl}">Open the shared profile</a></p>
</body></html>`);
});
