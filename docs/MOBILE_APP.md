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
3. Push notifications for new messages (migration 33, `20261210000000_push_notifications.sql`). The app asks to allow notifications once a member is signed in with an account, saves the phone in `push_devices`, and the database sends the push through Expo's push service the moment a message is saved. The notification names the sender and never shows the message. Tapping it opens the conversation; the app icon shows the unread count. Members switch it off under Settings, "Phone notifications" (app only). Signing out removes the phone. Code: `src/lib/push.ts`, `src/components/PushManager.tsx`.
4. Map view in the app (`src/components/BrowseMap.tsx`, `react-native-maps`). iPhone and iPad use Apple Maps, which needs no key. Tapping a pin shows a small card with a View profile button. Android shows a "coming soon" note until a Google Maps key is added to the Android build and `EXPO_PUBLIC_ANDROID_MAPS=1` is set; that is part of the Android set-up later.
5. Links that open the app. When the app is installed, tapping an independentjourney.com link in an email or text opens the app instead of the browser: confirmation and password-reset links (`/confirm`), shared profiles (`/s/...`, `/share/...`, `/profile/...`), "Read and reply" message links, and Browse, Membership and Settings links from emails. Everything else (homepage, legal pages, admin) stays in the browser. Without the app, links behave exactly as before.
6. Next: store prep. Payments come before the beta ends.

### Links that open the app: how it is wired

- `public/.well-known/apple-app-site-association` on the website lists the app (Apple team `6R88QQYM98`, bundle `com.independentjourney.app`) and the paths above. iPhones download it when the app is installed.
- `app.json` has `ios.associatedDomains` and Android `intentFilters` for the same paths. To add a path, change it in both places.
- Adding this permission changes the app's signing profile, so the first build after it must be run from Seth's computer again (the same build command, logging in to Apple), not from GitHub.
- Android also needs `public/.well-known/assetlinks.json` with the app's signing fingerprint. That file is added with the first Android build.
- Apple caches the file for up to a day, and a link typed into Safari or tapped inside the app itself never jumps to the app; test from Mail, Messages or Notes.

### Push notifications: what needs setting up

- **Supabase:** run migration 33. It switches on the `pg_net` extension, which lets the database call Expo.
- **iPhone:** the first build from a computer asks "Set up Push Notifications?" Answer yes; Expo creates and stores the Apple push key.
- **Android (later):** needs a free Firebase project and its `google-services.json` before pushes arrive. Covered when we do the Android build.
- Pushes cannot be tested in a simulator or the browser preview; they need a real phone with a TestFlight build.

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
