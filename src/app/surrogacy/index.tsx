/**
 * /surrogacy: list of all state pages, grouped by our plain-language summary
 * of each state's law. Public page.
 */
import { ArticlePage } from '@/components/ArticlePage';
import type { ArticleBlock } from '@/content/firstConversation';
import { RELATED } from '@/content/guides/shared';
import { type LawStatus, SOURCE_AAAA, SOURCE_ASRM, SOURCE_S360, STATE_LAWS, STATE_LAWS_REVIEWED, STATUS_LABEL } from '@/content/stateLaws';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Surrogacy Laws by State: Find a Surrogate in Your State',
    description:
      'Surrogacy law in brief for all 50 states and DC, each checked against two published sources, with surrogates and intended parents to browse in every state. Not legal advice.',
    path: '/surrogacy',
  });
}

const ORDER: LawStatus[] = ['statute', 'limits', 'courts', 'unaddressed', 'restricted'];

const BLOCKS: ArticleBlock[] = [
  {
    kind: 'p',
    text: 'There is no national surrogacy law in the United States. Each state sets its own rules on whether an agreement can be enforced, whether a surrogate can be paid, who can be an intended parent, and how the intended parents become the legal parents. Choose a state for its law in brief and the members there.',
  },
  {
    kind: 'p',
    text: 'The groupings below are our plain-language summary of two published overviews. They are a starting point for a conversation with an attorney, not a ruling on any state.',
  },
  ...ORDER.flatMap((status): ArticleBlock[] => [
    { kind: 'h2', text: STATUS_LABEL[status] },
    { kind: 'links', items: STATE_LAWS.filter((s) => s.status === status).map((s) => ({ label: `Surrogacy in ${s.name}`, path: `/surrogacy/${s.slug}` })) },
  ]),
  { kind: 'h2', text: 'Related guides' },
  { kind: 'links', items: [RELATED.legal, RELATED.find, RELATED.become, RELATED.versus] },
  {
    kind: 'note',
    text: 'Independent Journey is an introduction platform, not a law firm, and nothing here is legal advice. State summaries report what outside organisations have published and may be out of date or incomplete. Always confirm the current law with a reproductive attorney licensed in the state concerned.',
  },
  { kind: 'h2', text: 'Sources' },
  { kind: 'sources', items: [SOURCE_S360, SOURCE_ASRM, SOURCE_AAAA] },
];

export default function SurrogacyByState() {
  return (
    <ArticlePage
      title="Surrogacy Laws by State"
      intro="Surrogacy law in brief for every state, and the surrogates and intended parents there."
      blocks={BLOCKS}
      reviewed={STATE_LAWS_REVIEWED}
      notice="This page is general information only and is not legal advice. Surrogacy law changes often. Speak to a reproductive attorney licensed in the state concerned before you rely on anything here."
    />
  );
}
