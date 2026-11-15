/**
 * Sends a Google Analytics page view for every page, including moves between
 * pages inside the site (which never reload the browser, so the Google tag in
 * +html.tsx would otherwise count only the first page). Web only; does nothing
 * when the tag is not loaded (deploy previews, local development, the apps).
 * Only the path is sent, never member names or message contents.
 */
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.gtag) return;
    window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
  }, [path]);
  return null;
}
