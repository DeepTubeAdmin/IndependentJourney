# Share-link previews (Facebook, iMessage, WhatsApp, X, LinkedIn)

When a member pastes their share link (`https://independentjourney.com/s/…`)
into Facebook or a chat app, that app fetches the link *without running the
website*, so it used to see only "independentjourney.com". Now a small
Supabase function answers those fetches with a preview card: the member's
first photo, "Megan R. · Texas · Surrogate", and their highlights. People who
click the link are sent straight to the normal page.

Nothing here costs money. Supabase's free tier includes 500,000 function
calls a month.

## 1. Deploy the function (3 minutes)

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `share-preview`.
3. Open
   [share-preview/index.ts](https://github.com/DeepTubeAdmin/IndependentJourney/blob/main/supabase/functions/share-preview/index.ts),
   click the copy icon, replace the editor's code with it, click
   **Deploy function**.
4. On the function's page open **Details** and switch
   **Verify JWT with legacy secret** **off** (Facebook has no key).

That is all: the function uses the Supabase address and service key that every
function gets automatically, plus the `SITE_URL` secret you already set for
emails.

## 2. Netlify: nothing to click

The website build now writes a small forwarding rule so that
`independentjourney.com/s/anything` is answered by the function. It uses the
Supabase address already in Netlify's environment variables. The rule is
created on the next deploy, which happens when this change is merged.

## 3. Check it

- Open `https://independentjourney.com/s/<a real token>?preview=1` in your
  browser. You should see a plain page with the name, state, role and
  highlights (this is what Facebook reads). Without `?preview=1` you land on
  the normal shared profile.
- Facebook caches previews. For a link you already posted, paste it into
  https://developers.facebook.com/tools/debug/ and click **Scrape Again**.
  New links are picked up straight away.
- X/Twitter: https://cards-dev.twitter.com/validator shows the card.

## What the card contains

| Field | Value |
| --- | --- |
| Image | The member's first photo (served from our domain, so it never expires) |
| Title | First name and initial · State · Surrogate / Intended parents |
| Description | Gestational surrogate or Intended parents · Identity verified · up to three highlights · "See the full shared profile on Independent Journey." |

Only members who are verified and complete can create share links, and the
member can turn the link off at any time, after which the card says the
profile is no longer available.
