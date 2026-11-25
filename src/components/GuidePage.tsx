/**
 * One search guide under /resources/ (see src/content/guides/). Adds the
 * stronger "not legal, medical, tax or financial advice" notice and the
 * "last reviewed" line to the shared article layout.
 */
import { ArticlePage } from '@/components/ArticlePage';
import { type Guide, GUIDE_NOTICE, GUIDES_REVIEWED } from '@/content/guides/shared';
import { pageMeta } from '@/lib/seo';

export function guideMeta(guide: Guide) {
  return pageMeta({ title: guide.title, description: guide.description, path: `/resources/${guide.slug}` });
}

export function GuidePage({ guide }: { guide: Guide }) {
  return <ArticlePage title={guide.title} intro={guide.intro} blocks={guide.blocks} reviewed={GUIDES_REVIEWED} notice={GUIDE_NOTICE} />;
}
