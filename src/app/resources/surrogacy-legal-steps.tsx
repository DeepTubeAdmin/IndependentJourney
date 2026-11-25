/**
 * Resources guide. The text and its sources live in
 * src/content/guides/legalSteps.ts; the layout is the shared GuidePage.
 * Public page (listed in the sitemap and in llms.txt).
 */
import { GuidePage, guideMeta } from '@/components/GuidePage';
import { LEGAL_STEPS } from '@/content/guides/legalSteps';

export function generateMetadata() {
  return guideMeta(LEGAL_STEPS);
}

export default function LegalStepsGuide() {
  return <GuidePage guide={LEGAL_STEPS} />;
}
