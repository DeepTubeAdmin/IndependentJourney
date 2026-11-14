# Photo caching (keeping Supabase egress low)

**The problem (Nov 2026).** Supabase's free plan includes 5 GB of egress a
month. On 13 Nov the site used 2.86 GB of storage egress in one day with no
public traffic. The cause was how photos were loaded: every page view asked
Supabase for new signed photo links that expired after 30 minutes. Each link
was unique, so browsers could never reuse a photo, and every homepage or
Browse visit (and every Lighthouse audit Netlify runs on a deploy) pulled
every photo again, at full phone size, straight from Supabase.

**The fix.** Photos of live profiles are now shown from our own domain:

    https://independentjourney.com/photos/<member id>/<file>

That address is handled by the Netlify edge function
`netlify/edge-functions/photo.ts`. The first request fetches the photo from
Supabase once, with the public (anon) key, so Supabase's own rule still
decides what may be read (only photos of live profiles, see
`photo_is_previewable`). Netlify's CDN then keeps a copy for 7 days and the
visitor's browser keeps one for 1 day. Repeat views cost Supabase nothing and
count against Netlify's bandwidth instead (100 GB a month on the free plan).

File names include the upload time and never change, so long caching is safe.
A photo a member deletes can stay in the CDN for up to 7 days at its old,
unguessable address.

**What still uses signed links.** A member editing their own photos (the
profile may not be live yet) and the admin dashboard. Those are low volume.

**Nothing to set up.** The edge function deploys with the site and reads the
same `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` variables
the website build uses. To check it is working, open a profile, right-click a
photo, copy its address: it should start with `/photos/`. Reloading the page
should not download the photo again (status 200 "from disk cache" or
`Cache-Status: "Netlify Edge"; hit` in the browser's Network tab).

**Photo size and framing (added the same day).** Every photo now goes through
a framing step before it is saved (`src/components/photos/PhotoCropper.tsx`):
the member drags and zooms the photo inside a 4:5 portrait frame, the shape
of the photo box on profile cards, so faces are where they want them. The
saved file is that crop, at most 1200 x 1500 pixels, JPEG at 85% quality:
a few hundred KB instead of 2 to 5 MB. Existing photos can be re-framed with
the **Adjust** button in the photos step, which replaces the stored file.
Photos uploaded before this change stay at their original size until the
member adjusts them.
