# Google and Apple sign-in: set-up guide

The website now shows "Continue with Google" and "Continue with Apple" on the
sign-up and log-in pages. The buttons work only once each provider is switched
on in Supabase, so follow this guide once. Nothing here costs money.

How it works for a member: they tick the three agreement boxes on the sign-up
page, press a social button, approve with Google or Apple, and land straight in
profile onboarding. Someone who presses a social button on the *log-in* page
without an account is asked once for their role and the agreements on a
"One more step" screen. Email + password sign-up is unchanged.

Facebook login is not included. It needs a Meta developer account, business
verification for anything beyond a test app, and an extra data-sharing line in
both app stores' privacy labels, for a provider most people now skip. It can be
added later with the same code path if members ask for it.

---

## Part A: Run migration 16 (2 minutes)

1. Open the file on GitHub:
   `supabase/migrations/20261123000000_social_login.sql`, click the **copy**
   icon at the top-right of the code.
2. Supabase dashboard → **SQL Editor** → **New query** → paste → **Run**.
   It is safe to run twice.

## Part B: Google (about 15 minutes)

### B1. Find your Supabase callback address

Supabase dashboard → **Authentication** → **Sign In / Providers** → click
**Google**. Copy the **Callback URL (for OAuth)** shown there. It looks like
`https://xxxxxxxx.supabase.co/auth/v1/callback`. Keep this tab open.

### B2. Create the Google client

1. Go to https://console.cloud.google.com and sign in with the Google account
   you want to own the project (your normal one is fine).
2. Top bar → project picker → **New project** → name it `Independent Journey`
   → **Create**, then select it.
3. Left menu → **APIs & Services** → **OAuth consent screen** (Google now calls
   this **Google Auth Platform** → **Branding**).
   - App name: `Independent Journey`
   - User support email: your email
   - App logo: optional (adding one triggers a Google review; skip for now)
   - App domain / home page: `https://independentjourney.com`
   - Privacy policy: `https://independentjourney.com/privacy`
   - Terms of service: `https://independentjourney.com/terms`
   - Authorized domains: add `independentjourney.com` and your project's
     Supabase host, e.g. `abcdefghijk.supabase.co` (the part of the callback
     URL before `/auth/v1/callback`). Google rejects a bare `supabase.co`.
     If it still complains, skip it: Google adds the domain automatically
     when you save the redirect URI in step 5.
   - Developer contact email: your email → **Save**.
4. **Audience** (or "Publishing status"): choose **External**, then click
   **Publish app**. Google may say it needs verification for the logo; it still
   lets anyone sign in with the basic email/profile scopes we use.
5. Left menu → **Clients** (or **Credentials**) → **Create credentials** →
   **OAuth client ID**.
   - Application type: **Web application**
   - Name: `Independent Journey website`
   - Authorized JavaScript origins: `https://independentjourney.com` only
   - Authorized redirect URIs: paste the Supabase callback URL from B1
   - **Create**.
6. A box shows **Client ID** and **Client secret**. Copy each with its copy
   icon. (The Client ID ends in `.apps.googleusercontent.com`.)

### B3. Paste into Supabase

Back in the Supabase Google provider panel from B1:

- Toggle **Enable Sign in with Google** on.
- **Client IDs**: paste the Client ID.
- **Client Secret (for OAuth)**: paste the Client secret.
- Leave "Skip nonce check" off. → **Save**.

### B3b. Tell the website the Client ID (so Google's popup names our site)

Without this step the Google screen says "Sign in to xxxx.supabase.co". With it,
the site uses Google's own popup, which names `independentjourney.com`.

1. Netlify → your site → **Site configuration** → **Environment variables** →
   **Add a variable** → **Add a single variable**.
2. Key: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`  Value: the Client ID from B2 step 6
   (ends in `.apps.googleusercontent.com`). Scopes: all. → **Create variable**.
3. **Deploys** → **Trigger deploy** → **Deploy site**. Wait for it to finish.

Optional, to show the words "Independent Journey" instead of the domain: in
Google Cloud → **Google Auth Platform** → **Branding**, add the logo
(`public/logo-512.png` from the repo) and click **Submit for verification**.
Google reviews the name and logo in a few days; sign-in keeps working meanwhile.

### B4. Allow the site to receive sign-ins

Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://independentjourney.com`
- **Redirect URLs**: add `https://independentjourney.com/welcome` and
  `https://independentjourney.com/**`. If you test Netlify deploy previews, also
  add `https://*.netlify.app/**`. → **Save**.

### B5. Test

Open https://independentjourney.com/sign-up in a private window, choose a role,
tick the boxes, press **Continue with Google**, pick an account. You should land
on the first onboarding step. Admin dashboard → Members shows the new member
with a Google provider.

## Part C: Apple (about 20 minutes, needs your Apple Developer account)

Wait until Apple has approved your Developer Program enrolment, then:

### C1. App ID

https://developer.apple.com/account → **Certificates, Identifiers & Profiles**
→ **Identifiers** → **+** → **App IDs** → **App** → Continue.

- Description: `Independent Journey`
- Bundle ID (Explicit): `com.independentjourney.app` (this is the ID the phone
  apps will use in Phase 8b, so keep it exactly)
- Capabilities: tick **Sign In with Apple** → Continue → Register.

### C2. Services ID (this is the web "client ID")

**Identifiers** → **+** → **Services IDs** → Continue.

- Description: `Independent Journey website`
- Identifier: `com.independentjourney.web` → Continue → Register.
- Click the new Services ID → tick **Sign In with Apple** → **Configure**:
  - Primary App ID: `com.independentjourney.app`
  - Domains and Subdomains: your Supabase project domain, e.g.
    `xxxxxxxx.supabase.co` (no https://)
  - Return URLs: the Supabase callback URL from B1
  - Next → Done → Continue → Save.

### C3. Key

**Keys** → **+** → Key Name `Independent Journey Sign in with Apple` → tick
**Sign In with Apple** → **Configure** → Primary App ID
`com.independentjourney.app` → Save → Continue → Register → **Download**.
This gives you a `.p8` file **once**; keep it somewhere safe. Note the
**Key ID** shown on that page, and your **Team ID** (top-right of the
developer site, under your name).

### C4. Make the client secret

Apple does not give a plain secret; it has to be generated from the key, and it
expires every **6 months**. Supabase keeps a generator:

1. Open https://supabase.com/docs/guides/auth/social-login/auth-apple and find
   the **Generate a client secret** section (there is a small form on the page).
2. Fill in: Team ID, Key ID, Services ID (`com.independentjourney.web`), and
   paste the contents of the `.p8` file (open it in a text editor; copy
   everything including the BEGIN/END lines).
3. Click generate and copy the long text it produces.
4. Put a reminder in your calendar for **5 months from today**: "Regenerate
   Apple sign-in secret" (repeat this step and paste the new one in C5).

### C5. Paste into Supabase

Supabase → **Authentication** → **Sign In / Providers** → **Apple**:

- Toggle **Enable Sign in with Apple** on.
- **Client IDs**: `com.independentjourney.web`
- **Secret Key (for OAuth)**: the generated secret from C4 → **Save**.

### C6. Test

Same as B5 with **Continue with Apple**. Apple may offer "Hide My Email";
that works fine, our emails are forwarded through Apple's relay. (If a member
hides their email, Resend emails still arrive, but you will see a
`@privaterelay.appleid.com` address in the admin dashboard.)

## Part D: Things to know

- **Two Google paths.** With `EXPO_PUBLIC_GOOGLE_CLIENT_ID` set, the site uses
  Google's popup and hands Google's ID token to Supabase (nonce-checked).
  Without it, the site falls back to the Supabase redirect, which works but
  shows the Supabase address on Google's screen. Supabase still needs the Client
  ID in its Google panel either way (it checks the token was issued for us).

- **Same email, two ways in.** If someone signed up with email and later
  presses Continue with Google using the same Gmail address, Supabase links the
  two automatically because the Google email is verified. Apple is linked the
  same way unless the member used Hide My Email.
- **Role cannot be changed.** A social member picks their role either on the
  sign-up page or on the "One more step" screen, exactly like email members.
- **Phone apps (Phase 8b)** will use the native Google and Apple sheets rather
  than a browser redirect. Apple's rule that Sign in with Apple must be offered
  whenever another social login exists is already satisfied.
- **Removing a provider** later is one toggle in Supabase; members who only
  have that provider would need to use "Forgot password" to set a password.
