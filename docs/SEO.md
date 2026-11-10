# Search (SEO) guide

What the site does for search engines, what you need to switch on, and how
to grow traffic from here. Written 2026-11-10.

## Built into the site

- Every page has its own title, description, canonical address and social
  share card (`src/lib/seo.ts`). Public pages are indexable; member, admin,
  account and shared-profile pages carry `noindex` so nobody's profile shows
  up in Google.
- `robots.txt` and `sitemap.xml` live in `public/` and are served from the
  site root. Add a line to the sitemap when a new public page is created.
- Structured data (Organization + WebSite) on every page, so Google knows
  the site's name, logo and country.
- Social share image `public/og-image.png` (1200x630) and
  `public/apple-touch-icon.png`. Regenerate both when the logo is final.
- Headings are real headings (H1 page title, H2 sections, H3 questions), the
  homepage has a plain-language FAQ, and Netlify's Lighthouse SEO score is 100.

## One-time set-up for you (free, 15 minutes)

1. **Google Search Console**: https://search.google.com/search-console →
   Add property → **Domain** → `independentjourney.com`. Google gives you a
   TXT record; add it in Netlify → Domain management → DNS records
   (Name `@`, Type TXT, Value the string Google shows). Click Verify.
   Then Sitemaps → enter `sitemap.xml` → Submit.
2. **Bing Webmaster Tools**: https://www.bing.com/webmasters → Import from
   Google Search Console (one click, covers Bing, DuckDuckGo and Yahoo).
3. **Google Business Profile** is not needed (no physical location).
4. After a week, check Search Console → Pages for anything "Excluded" that
   should not be, and → Performance for which searches bring people in.

## Growing traffic to a broad audience

Search traffic in this space comes from people typing questions, so the
lever is content: one useful, honest page per question. The current
Resources page is a single bullet list. The highest-value next step is to
turn it into separate articles, each on its own address, each 800 to 1,500
words, labelled "general information, not advice", reviewed once by your
attorney. Suggested first ten, in order of search demand:

1. How to find a surrogate without an agency (independent surrogacy guide)
2. Independent surrogacy cost breakdown vs agency surrogacy
3. How to become a surrogate independently: requirements and steps
4. Surrogate compensation: what is typical and how escrow works
5. Surrogacy laws by state (a table; attorney-reviewed, updated yearly)
6. Questions to ask a potential surrogate / intended parents
7. How to spot surrogacy scams online
8. Gestational surrogacy vs traditional surrogacy
9. What a gestational carrier agreement covers
10. Surrogacy for single parents and LGBTQ+ families

Each article should link to Browse and Join, and the homepage FAQ should
link to the matching article. Ask Claude to build the article pages (a
simple `resources/[slug]` route with the text in a config file) when you
are ready to write or approve the content.

Other cheap wins, in order:
- Ask surrogacy communities and attorneys who like the no-agency model to
  link to the site; a handful of real links matter more than anything else.
- Post the shareable profile links and the FAQ answers on Reddit
  (r/surrogacy), Facebook groups and TikTok where the rules allow.
- Keep the homepage member cards real: Google rewards pages that change.
- Later: a short "state guide" page for each friendly state (California,
  Illinois, Washington, Nevada, Colorado, Connecticut, Maine, New York).

## Things to avoid

- Do not buy links, traffic or "SEO packages".
- Do not add analytics or ad pixels without updating the Privacy Policy
  and adding a cookie banner. Netlify Analytics ($9/month) is cookie-free
  if you want visitor counts.
- Never let a member profile page become indexable; the `noindex` on
  `/profile/*` and `/s/*` is deliberate.
