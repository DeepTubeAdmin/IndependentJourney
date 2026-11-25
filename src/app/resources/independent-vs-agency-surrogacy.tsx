/**
 * Resources guide. The text and its sources live in
 * src/content/guides/versus.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { VERSUS } from '@/content/guides/versus';

export function generateMetadata() {
  return guideMeta(VERSUS);
}

export default function VersusGuide() {
  return <GuidePage guide={VERSUS} />;
}
