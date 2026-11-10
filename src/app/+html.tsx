/**
 * The HTML wrapper for every page of the website (web only).
 * Runs at build time during static export, not in the browser.
 */
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const SITE_URL = 'https://independentjourney.com';
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Independent Journey',
      url: SITE_URL,
      logo: `${SITE_URL}/apple-touch-icon.png`,
      description:
        'An introduction platform for intended parents and gestational surrogates planning an independent, agency-free surrogacy journey in the United States.',
      areaServed: 'US',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Independent Journey',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
  ],
};

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#F8F5EF" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#F8F5EF;}' }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Tells search engines who runs the site and what it is (shown as a knowledge panel / sitelinks search box). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
