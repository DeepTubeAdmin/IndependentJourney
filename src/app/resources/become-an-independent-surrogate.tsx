/**
 * Resources guide. The text and its sources live in
 * src/content/guides/becomeSurrogate.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { BECOME_SURROGATE } from '@/content/guides/becomeSurrogate';

export function generateMetadata() {
  return guideMeta(BECOME_SURROGATE);
}

export default function BecomeSurrogateGuide() {
  return <GuidePage guide={BECOME_SURROGATE} />;
}
