/**
 * Resources article: the steps after a match (clearances, counseling, legal,
 * mock cycle, transfer, birth). Text in src/content/afterTheMatch.ts.
 */
import { ArticlePage } from '@/components/ArticlePage';
import { AFTER_THE_MATCH, AFTER_THE_MATCH_INTRO, AFTER_THE_MATCH_TITLE } from '@/content/afterTheMatch';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: AFTER_THE_MATCH_TITLE,
    description:
      'What happens after a surrogate and intended parents match: OB clearance, fertility clinic screening, psychological evaluation, legal contracts, mock cycle, the transfer cycle, and the pregnancy through birth, with typical timing for each step.',
    path: '/resources/after-the-match',
  });
}

export default function AfterTheMatch() {
  return <ArticlePage title={AFTER_THE_MATCH_TITLE} intro={AFTER_THE_MATCH_INTRO} blocks={AFTER_THE_MATCH} />;
}
