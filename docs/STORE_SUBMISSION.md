# App Store and Google Play submission guide

Use this once the phone apps are built (Phase 8b: Expo EAS builds plus
RevenueCat). Nothing here applies to the website, which is already live.

Costs: Apple Developer Program $99/year, Google Play developer account $25
once. Create both as **individual** accounts (no LLC yet). You can switch
to an organization account later.

## 0. Before you submit anything

- [ ] Website checklist (LAUNCH_CHECKLIST.md) passed, legal pages reviewed by
      your attorney, "Draft" banner removed.
- [ ] A support email address and a support page (the Resources page is fine)
      exist. Both stores require a support URL and a privacy policy URL:
      `https://independentjourney.com/privacy`.
- [ ] A **demo account for reviewers** on each side: a surrogate and an
      intended parent with complete profiles, a conversation between them,
      and an active membership on the IP. Reviewers must be able to see every
      screen without paying. Put the logins in the review notes (below).
- [ ] App icon 1024×1024 with no transparency and no rounded corners (Apple
      rounds it). The Expo project already has `assets/icon.png`; check it.

## 1. TestFlight (iOS internal testing)

1. In App Store Connect (https://appstoreconnect.apple.com) → **Apps** →
   **+** → New App. Platform iOS, name "Independent Journey", primary
   language English (US), bundle ID `com.independentjourney.app` (registered
   automatically by the EAS build), SKU `independentjourney`.
2. Build and upload: `eas build --platform ios --profile production` then
   `eas submit --platform ios`. Claude will give you the exact commands and
   the `eas.json` file in Phase 8b.
3. App Store Connect → your app → **TestFlight**. The build appears after
   processing (10 to 30 minutes). Fill **Test Information** (what to test,
   your email) and answer the export-compliance question: the app uses only
   standard HTTPS encryption, so answer **No** to "does it use non-exempt
   encryption" (Claude will also set `ITSAppUsesNonExemptEncryption = false`
   in the app config so the question stops appearing).
4. **Internal testing** group: add yourself and up to 100 people with Apple
   IDs; they install the TestFlight app and get the build immediately with
   no review. **External testing** (anyone with a link) needs a one-time
   light review by Apple, usually within a day.

## 2. Google Play internal testing

1. Play Console (https://play.google.com/console) → **Create app**. Name
   "Independent Journey", default language English (US), App (not Game),
   Free.
2. Complete the **Dashboard** set-up tasks in order. Play will not let you
   publish until every one is done: privacy policy URL, app access (give the
   demo logins), ads (none), content rating questionnaire, target audience
   (18 and over), news app (no), data safety (section 5 below), government
   app (no), financial features (none; the membership is not a financial
   product), health (declare that the app collects self-reported health
   information from users).
3. Build and upload: `eas build --platform android --profile production`
   then `eas submit --platform android` (an `.aab` file).
4. **Testing → Internal testing** → Create release → upload the bundle →
   add testers by email (up to 100) → copy the opt-in link and open it on an
   Android phone.
5. **Important for new personal accounts**: before you can publish to
   production, Google requires a **closed test with at least 12 testers
   opted in for 14 consecutive days**, and then you apply for production
   access from the dashboard. Start this early, the day the Android build
   first works. Friends and family count as testers.

## 3. Store listing copy (both stores)

**Name:** Independent Journey
**Subtitle (Apple, 30 chars):** Independent surrogacy matches
**Short description (Google, 80 chars):** Where intended parents and gestational surrogates meet, on their own terms.

**Description (both):**

> Independent Journey is a calm, trust-focused place for intended parents
> and gestational surrogates who want to find each other and plan an
> independent (non-agency) surrogacy journey.
>
> • Surrogates always join free. Intended parents pay a simple membership
>   to read full profiles and message.
> • Every profile is clearly labelled Verified or Not verified. Optional
>   photo-ID verification is free.
> • Browse by state and preferences, see who is active, save profiles and
>   searches.
> • Private messaging with safety features: block, report, scam-pattern
>   warnings, and a safety team that can review messages when something
>   looks wrong.
> • No match fees, no outcome fees, ever. Once you have met, you work with
>   your own clinic and attorney.
>
> Independent Journey is not an agency, a law firm or a medical provider,
> and gives no legal, medical or surrogacy advice. Members are responsible
> for verifying everything themselves.

**Keywords (Apple, 100 chars):** surrogacy,surrogate,intended parents,gestational carrier,IVF,fertility,independent surrogacy

**Category:** Apple: Lifestyle (secondary: Social Networking). Google: Lifestyle.

**Age rating:** Apple's questionnaire: answer "Yes" only to "Unrestricted web
access: No", "User-generated content: Yes", "Mature/Suggestive themes:
Infrequent/Mild" (pregnancy and reproduction topics). Expect **18+** under
Apple's current tiers; that matches the sign-up rule. Google's content
rating questionnaire (IARC): declare user interaction, sharing of personal
information, and that users can communicate; set target audience 18+.

## 4. Screenshots

Take them from the real app on a phone or simulator, signed in as the demo
accounts, with the beta pop-up closed. Apple needs the 6.9-inch iPhone size
(1320×2868) and, if the app supports iPad, a 13-inch iPad set; Google needs
at least two phone screenshots (1080×1920 or similar) plus a 1024×500
feature graphic. Suggested order, with the same five on both stores:

1. Homepage with member cards.
2. Browse with filters (surrogate previews).
3. A full profile with the Verified label.
4. A conversation with the "Never send money" banner visible.
5. The questionnaire's review page ("Complete and visible to members").

Avoid showing real members; use the demo accounts. Do not show prices in
screenshots (they change in settings).

## 5. Privacy labels and data safety

Answer from what the app actually stores. Everything below is linked to the
user's identity (it is their account) and used for app functionality only:
no analytics, no advertising, no tracking, no data sold or shared with
third parties for their own purposes.

| Data | Apple "App Privacy" type | Google "Data safety" category | Notes |
| --- | --- | --- | --- |
| Email, phone, first and last name | Contact Info | Personal info | Phone is optional. |
| Date of birth, age | Other / Sensitive Info | Personal info | Age shown; date of birth private. |
| City, state, ZIP | Location (Coarse) | Location (Approximate) | ZIP centre-point only, never GPS. |
| Photos | User Content → Photos or Videos | Photos and videos | Profile photos. |
| Messages | User Content → Other User Content | Messages → In-app messages | Reviewable by admins for safety; say so. |
| Bio and journey answers | User Content → Other | Personal info → Other | |
| Self-reported health yes/no answers (surrogates) | Health & Fitness → Health | Health and fitness → Health info | Declare it. Never shown to other members. |
| Family structure, reason for surrogacy | Sensitive Info | Personal info → Sexual orientation / other | Optional questions with "prefer not to say". |
| Membership purchase | Purchases → Purchase History | Financial info → Purchase history | Processed by Stripe / Apple / Google; no card numbers stored. |
| Identity verification | Identifiers / Sensitive Info | Personal info → Other | Done by Stripe Identity; the app stores only the result (verified or not). |
| User ID | Identifiers → User ID | Device or other IDs | The Supabase account id. |
| Crash data / analytics | None | None | The app sends none. |

Also tick on Google: data is encrypted in transit, users can request
deletion (link `https://independentjourney.com/settings`, and describe
Settings → Delete my account), and provide the **account deletion URL**
field, which Google requires for apps with accounts.

## 6. App review notes (paste into both stores)

> Independent Journey introduces intended parents and gestational surrogates
> who are planning an independent surrogacy journey. It is an introduction
> platform, not an agency, and offers no medical, legal or financial
> services.
>
> Demo accounts (full access, no payment needed):
> Surrogate: [email] / [password]
> Intended parent with active membership: [email] / [password]
>
> User-generated content: profiles and private messages. Members can block
> and report from every profile and conversation; a safety team reviews
> reports within 24 hours and can hide messages, warn, suspend or ban.
> Messages are scanned for scam patterns and members are warned. Members
> must confirm at sign-up that they are individuals, not agencies.
>
> Account deletion is available in-app under Settings → Delete my account,
> and a copy of all personal data can be downloaded from the same screen.
>
> Membership (intended parents only) is a one-time purchase for a fixed
> period, not an auto-renewing subscription. On iOS it is sold through
> in-app purchase [and, in the US, through an external purchase link as
> permitted]. Surrogates never pay.
>
> Identity verification is optional and performed by Stripe Identity; the
> app never stores ID documents.

## 7. Common rejection reasons and how this app avoids them

| Rule | What they look for | What we have |
| --- | --- | --- |
| Apple 1.2 / Google UGC policy | Filtering, report, block, a way to contact you, timely action | Report and block everywhere, scam filter, safety team, 24-hour promise in the notes |
| Apple 5.1.1(v) / Google account deletion | In-app account deletion | Settings → Delete my account |
| Apple 3.1.1 | Digital content must use in-app purchase | Membership through IAP (RevenueCat); the US external-link option is a separate entitlement to request |
| Apple 5.1.1 | Only collect data the app needs; privacy policy link | Privacy page, minimal questionnaire, "prefer not to say" options |
| Apple 4.2 | Not "just a website" | Native navigation, push-ready, in-app purchase; still, make sure the app feels native in Phase 8b |
| Apple 5.1.2 | Health data must not be used for advertising | No ads, no analytics |
| Both | Demo account that actually works | Test the demo logins the morning you submit |
| Both | Age rating matches content | 18+ |

## 8. After approval

- Apple: release manually (not automatically) the first time so you can
  check the listing, then **Phased release** is unnecessary at this size.
- Add the App Store and Play Store badges to the homepage (ask Claude).
- Universal links / app links so `independentjourney.com/profile/…` opens
  the app when installed: part of Phase 8b.
