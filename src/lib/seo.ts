/**
 * Search-engine metadata for every web page, built in one place so titles,
 * descriptions, social-share cards and "do not index" flags stay consistent.
 *
 * Usage in a route file:
 *   export function generateMetadata() { return pageMeta({ title: 'Browse', description: '…', path: '/browse' }); }
 *
 * Public marketing pages are indexed. Member, admin and account pages are
 * marked noindex so search engines never list them.
 */
import type { Metadata } from 'expo-router/server';

import { SITE } from '@/config/settings';

type PageMetaOptions = {
  /** Page title without the site name; it is appended automatically. */
  title: string;
  /** 120 to 160 characters, written for a person reading a search result. */
  description: string;
  /** Path of the page, for the canonical URL and share cards. */
  path: string;
  /** True for pages that must never appear in search results. */
  noindex?: boolean;
};

/** Social share image (1200x630), generated at build time into public/. */
export const OG_IMAGE = `${SITE.url}/og-image.png`;

export function pageMeta({ title, description, path, noindex = false }: PageMetaOptions): Metadata {
  const url = `${SITE.url}${path === '/' ? '' : path}`;
  const fullTitle = path === '/' ? title : `${title} | ${SITE.name}`;
  return {
    title: fullTitle,
    description,
    applicationName: SITE.name,
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: 'en_US',
      title: fullTitle,
      description,
      url,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline}` }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [OG_IMAGE] },
    icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  } as Metadata;
}

/** Metadata for signed-in pages: a title for the browser tab, hidden from search. */
export function privateMeta(title: string): Metadata {
  return { title: `${title} | ${SITE.name}`, robots: 'noindex, nofollow' } as Metadata;
}
