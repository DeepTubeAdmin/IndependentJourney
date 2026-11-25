/**
 * Resources guide. The text and its sources live in
 * src/content/guides/compensation.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { COMPENSATION } from '@/content/guides/compensation';

export function generateMetadata() {
  return guideMeta(COMPENSATION);
}

export default function CompensationGuide() {
  return <GuidePage guide={COMPENSATION} />;
}
