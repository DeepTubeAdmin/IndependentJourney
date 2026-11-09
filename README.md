# Independent Journey

A website and iOS/Android app that introduces intended parents and gestational
surrogates for independent (non-agency) surrogacy journeys.
Domain: IndependentJourney.com

> Independent Journey is an introduction platform. It is not a surrogacy
> agency, law firm, or medical provider, and it gives no legal, medical, or
> surrogacy advice.

## How it's built

| Part | Tool |
| --- | --- |
| Web + iOS + Android app (one codebase) | [Expo](https://docs.expo.dev) with Expo Router, TypeScript |
| Database, login, photos, live messaging | [Supabase](https://supabase.com) |
| Server code (webhooks, emails, scam scanning) | Supabase Edge Functions |
| Website hosting | [Netlify](https://netlify.com) |
| Subscriptions | RevenueCat (web via Stripe, plus Apple and Google) |

## Folders

```
src/app/               Screens. Each file is a page (Expo Router).
src/components/        Reusable building blocks.
src/lib/               Supabase client, theme, helpers.
src/config/settings.ts Fallback values for price, term, limits (live values are in the database).
supabase/migrations/   Database tables and row-level security rules, applied in order.
supabase/functions/    Server code (Edge Functions).
docs/                  Setup guides.
netlify.toml           Website build settings for Netlify.
.env.example           The environment variables the app needs (no values).
```

## Run it on your computer

You need [Node.js 22](https://nodejs.org) installed.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run web                  # opens the website at http://localhost:8081
```

Other commands:

```bash
npm run build:web   # builds the website into the dist/ folder (what Netlify runs)
npm run typecheck   # checks the code for type errors
```

## Setup guides

See [docs/SETUP.md](docs/SETUP.md) for step-by-step account setup (Supabase,
Netlify, domain).
