/**
 * Web addresses for member photos.
 *
 * Photos of live profiles (homepage cards, Browse, profile pages, share links)
 * are served from our own domain at /photos/<path> by the Netlify edge
 * function in netlify/edge-functions/photo.ts, which caches them. The address
 * for a photo never changes, so browsers and Netlify's CDN reuse it instead of
 * downloading from Supabase on every page view (that is what blew through
 * Supabase's free egress allowance).
 *
 * Signed links (short-lived, one per page view) remain only where the photo is
 * not public: a member editing their own photos, and the admin dashboard.
 */
import { Platform } from 'react-native';

import { SITE } from '@/config/settings';

/** Cached address of one stored photo (storage path "<member id>/<file>"). */
export function cachedPhotoUrl(storagePath: string): string {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  // The website can use a relative address (works on deploy previews too);
  // the mobile apps need the full one.
  const base = Platform.OS === 'web' ? '' : SITE.url;
  return `${base}/photos/${encoded}`;
}

/** Cached addresses for a list of stored photos, in the same order. */
export function cachedPhotoUrls(storagePaths: string[]): string[] {
  return storagePaths.map(cachedPhotoUrl);
}
