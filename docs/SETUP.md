# Setup guide (Phase 2)

Follow these in order. Each takes 5 to 15 minutes. Dashboard menus change from
time to time; if a button has moved, look for the closest match or ask Claude.

## 1. Supabase (database and login)

1. Go to https://supabase.com and click **Start your project**. Sign up with
   your GitHub account (simplest).
2. Click **New project**.
   - Organization: create one called "Independent Journey".
   - Project name: `independent-journey-prod`
   - Database password: click **Generate a password** and save it in your
     password manager. You will rarely need it, but you can't see it again.
   - Region: **East US (North Virginia)** or the US region closest to you.
   - Plan: Free for now. Upgrade to Pro ($25/month) right before launch so
     you get daily backups and the project never pauses.
3. Wait about 2 minutes for the project to be created.
4. Create the first tables: in the left sidebar click **SQL Editor**, then
   **New query**. Open the file
   `supabase/migrations/20261105000000_app_settings.sql` from the repository
   on GitHub, copy all of it, paste it into the editor, and click **Run**.
   You should see "Success. No rows returned".
5. Get the two public values the app needs: click **Project Settings** (gear
   icon) → **API Keys** (or **API**). Copy:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **Publishable key** (or **anon public** key on older dashboards)

   Do **not** copy the `service_role` or **secret** key anywhere except
   Supabase itself. It bypasses all security rules.

## 2. Netlify (website hosting)

1. Log in at https://app.netlify.com.
2. Click **Add new project** (or **Add new site**) → **Import an existing
   project** → **GitHub**. Approve access to the
   `DeepTubeAdmin/IndependentJourney` repository when GitHub asks.
3. Pick the `IndependentJourney` repository. Netlify reads the build settings
   from `netlify.toml`, so leave them as shown:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
4. Before clicking deploy, click **Add environment variables** (or do it
   after under **Project configuration → Environment variables**) and add:

   | Key | Value |
   | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | The Project URL from Supabase step 5 |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The publishable/anon key from Supabase step 5 |
   | `EXPO_PUBLIC_APP_ENV` | `production` |

5. Click **Deploy**. After 2 to 4 minutes you get a web address like
   `something-random.netlify.app`. Open it: you should see the Independent
   Journey "Launching soon" page.

From now on, every change merged into the `main` branch on GitHub deploys
automatically, and every pull request gets its own preview link.

## 3. Connect IndependentJourney.com

1. In Netlify, open the project → **Domain management** → **Add a domain**.
2. Type `independentjourney.com` and click **Verify**, then **Add domain**.
3. Netlify offers two ways to point the domain. Pick one:
   - **Easiest: Netlify DNS.** Click **Set up Netlify DNS**. Netlify shows four
     nameservers (like `dns1.p01.nsone.net`). Log in where you bought the
     domain (GoDaddy, Namecheap, Squarespace, etc.), find **Nameservers**,
     choose **Custom**, and paste the four Netlify nameservers.
     Note: if you use email at this domain, tell Claude first so we copy your
     email (MX) records into Netlify before switching.
   - **Keep your current DNS.** At your registrar, add the records Netlify
     shows you: usually an `A` record for `@` pointing to Netlify's load
     balancer IP, and a `CNAME` for `www` pointing to your
     `something.netlify.app` address.
4. Changes take from a few minutes to 24 hours. Netlify then issues a free
   HTTPS certificate automatically (**Domain management → HTTPS**).
5. Check: https://independentjourney.com shows the "Launching soon" page with
   a padlock in the address bar.

## 4. Expo (needed later, for the apps)

Create a free account at https://expo.dev/signup now so it's ready. We won't
use it until the app-build phase.

## 5. Apple and Google (start early)

Because there's no LLC yet, enroll as an **individual**. Your personal name
will appear as the seller on the store listing. You can switch to an
organization account later once you form an LLC.

- Apple Developer Program: https://developer.apple.com/programs/enroll/
  ($99/year, approval can take a few days to a few weeks).
- Google Play Console: https://play.google.com/console/signup ($25 once).
  New individual accounts must run a closed test with testers before
  publishing, so starting early helps.
