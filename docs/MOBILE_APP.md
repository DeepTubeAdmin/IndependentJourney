# Mobile apps (iPhone, iPad, Android)

The apps are the same code as the website, built by Expo's cloud build
service (EAS). Plan and decisions: see the "Independent Journey mobile app
plan" doc. Store submission steps: [STORE_SUBMISSION.md](STORE_SUBMISSION.md).

## Seth's decisions (2026-11-19)

- iPhone first, then Android. iPad is supported.
- Admin dashboard: website only. Agency accounts: in the app.
- Payments after the beta: in-app purchase only. One-time $199 / 3 months stays.
- Store listing: United States only.
- Push notifications on by default for new messages only.
- Anything added to the app for Apple/Google review is added to the website too.

## How the app differs from the website

| Piece | Where it lives |
| --- | --- |
| Bottom tab bar | `src/components/AppTabBar.tsx` (renders nothing on the website) |
| Compact top bar with Back arrow | `src/components/SiteHeader.tsx` (`isApp` branch) |
| "Me" tab | `src/app/(app)/me.tsx` |
| App vs website switch | `src/lib/platform.ts` (`isApp`) |
| Saved-on-device values (guest pass, drafts) | `src/lib/storage.ts` |
| Expo project link, permission wording | `app.json`, `eas.json` |

To look at the phone layout in a browser without a build:
`EXPO_PUBLIC_APP_SHELL=1 npx expo start --web` and narrow the window.

## Build steps so far

1. Phone layout (this file's first version): tab bar, Me tab, phone storage,
   one-tap Report/Block, Blocked members list, support email.
2. Apple and Google sign-in in the apps (`src/lib/socialNative.ts`); set-up in
   [SOCIAL_LOGIN_SETUP.md](SOCIAL_LOGIN_SETUP.md) Part E.
3. Next: push notifications, native map, links that open the app, then store prep. Payments come before the beta ends.

## One-time Expo setup (Seth)

1. expo.dev → project **independent-journey** → **Environment variables**:
   add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with the
   same values Netlify has, for the development, preview and production
   environments (visibility: plain text; they are public values).
2. expo.dev → Project settings → **GitHub**: connect the
   `DeepTubeAdmin/IndependentJourney` repository.
3. The very first iPhone build must be started once from a computer so Expo
   can create the Apple signing certificate (it asks for the Apple ID and a
   2FA code). After that, builds can be started from expo.dev or by Claude.
