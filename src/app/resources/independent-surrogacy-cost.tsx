/**
 * Resources guide. The text and its sources live in
 * src/content/guides/cost.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { COST } from '@/content/guides/cost';

export function generateMetadata() {
  return guideMeta(COST);
}

export default function CostGuide() {
  return <GuidePage guide={COST} />;
}
