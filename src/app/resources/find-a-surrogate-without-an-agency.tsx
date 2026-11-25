/**
 * Resources guide. The text and its sources live in
 * src/content/guides/findSurrogate.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { FIND_SURROGATE } from '@/content/guides/findSurrogate';

export function generateMetadata() {
  return guideMeta(FIND_SURROGATE);
}

export default function FindSurrogateGuide() {
  return <GuidePage guide={FIND_SURROGATE} />;
}
