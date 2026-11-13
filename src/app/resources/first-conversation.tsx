/**
 * Resources article: the first conversation between a surrogate and
 * intended parents. The text lives in src/content/firstConversation.ts; the
 * layout is the shared ArticlePage. Public page (listed in the sitemap).
 */
import { ArticlePage } from '@/components/ArticlePage';
import { FIRST_CONVERSATION, FIRST_CONVERSATION_INTRO, FIRST_CONVERSATION_TITLE } from '@/content/firstConversation';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: FIRST_CONVERSATION_TITLE,
    description:
      'A thorough question list for the first call between a surrogate and intended parents: termination, embryo transfer, daily life, communication, money, insurance, delivery, legal basics and red flags.',
    path: '/resources/first-conversation',
  });
}

export default function FirstConversation() {
  return <ArticlePage title={FIRST_CONVERSATION_TITLE} intro={FIRST_CONVERSATION_INTRO} blocks={FIRST_CONVERSATION} />;
}
