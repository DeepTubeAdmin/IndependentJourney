/**
 * Shared pieces for the search guides under /resources/.
 *
 * Every factual claim in the guides is tied to one of the outside sources
 * below, and each guide lists the ones it used. The facts were checked in
 * November 2026. When you update a guide, re-check the source and change
 * GUIDES_REVIEWED.
 *
 * The guides are general information. They are not legal, medical, tax or
 * financial advice, and every one of them says so at the top and the bottom.
 */
import type { ArticleBlock } from '@/content/firstConversation';

export type Guide = {
  /** Page address: /resources/<slug>. */
  slug: string;
  title: string;
  /** One line under the title. */
  intro: string;
  /** For search results, about 150 characters. */
  description: string;
  blocks: ArticleBlock[];
};

/** Month the facts in the guides were last checked against their sources. */
export const GUIDES_REVIEWED = 'November 2026';

/** Shown at the top of every guide. */
export const GUIDE_NOTICE =
  'This guide is general information only. It is not legal, medical, tax or financial advice, and reading it does not create an attorney-client or any other professional relationship. Surrogacy law differs from state to state and changes often. Before you make a decision, talk to a reproductive attorney licensed in the states involved, your fertility clinic, and a tax professional.';

/** Closing note placed at the end of every guide, before the sources. */
export const CLOSING_NOTE: ArticleBlock = {
  kind: 'note',
  text: 'Independent Journey is an introduction platform. We are not a surrogacy agency, a law firm, a medical provider, an escrow company or a tax adviser, and nothing here is advice for your situation. Figures quoted from other organisations are theirs, not ours, and may be out of date. Always confirm the law, the costs and the medical requirements with licensed professionals before you rely on them.',
};

/** Outside sources, kept in one place so a link is fixed once. */
export const SRC = {
  asrm2022: {
    label: 'American Society for Reproductive Medicine (ASRM), “Recommendations for practices using gestational carriers: a committee opinion” (2022)',
    url: 'https://www.asrm.org/practice-guidance/practice-committee-documents/recommendations-for-practices-using-gestational-carriers-a-committee-opinion-2022/',
  },
  asrmEthics2023: {
    label: 'ASRM Ethics Committee, “Consideration of the gestational carrier: an Ethics Committee opinion” (2023)',
    url: 'https://www.asrm.org/practice-guidance/ethics-opinions/consideration-of-the-gestational-carrier-an-ethics-committee-opinion-2023/',
  },
  asrmStates: {
    label: 'ASRM Legal Professional Group, “Surrogacy Laws By State” (overview, updated state by state)',
    url: 'https://connect.asrm.org/lpg/resources/surrogacy-by-state',
  },
  nyDoh: {
    label: 'New York State Department of Health, clinical guidelines for screening of gestational surrogates (revised February 2021)',
    url: 'https://healthweb-back.health.ny.gov/community/pregnancy/surrogacy/docs/gestational_surrogacy_guidelines.pdf',
  },
  axiosCost: {
    label: 'Axios, “How much surrogacy costs” (March 2026), reporting figures compiled by the fertility-benefits company Carrot',
    url: 'https://www.axios.com/2026/03/28/surrogacy-cost-agency-how-much',
  },
  axiosStates: {
    label: 'Axios, on how surrogacy law differs by state (March 2026), reporting Surrogacy360 figures',
    url: 'https://www.axios.com/2026/03/29/surrogacy-state-law-different',
  },
  goodrx: {
    label: 'GoodRx Health, “How Much Does Surrogacy Cost?” (March 2024, medically reviewed)',
    url: 'https://www.goodrx.com/conditions/fertility/how-much-does-surrogacy-cost',
  },
  circle: {
    label: 'Circle Surrogacy (a surrogacy agency), “Surrogacy costs breakdown” (updated 2026)',
    url: 'https://www.circlesurrogacy.com/post/surrogacy-costs-breakdown',
  },
  bump: {
    label: 'The Bump, “Independent Surrogacy vs. Agency Surrogacy” (October 2022), quoting a surrogacy-center director and a fertility-law attorney',
    url: 'https://www.thebump.com/a/independent-surrogacy-vs-agency-surrogacy',
  },
  abaFaq: {
    label: 'American Bar Association, Family Advocate, Richard B. Vaughn, “Assisted Reproductive Technology Law: 10 FAQs” (Summer 2019)',
    url: 'https://www.americanbar.org/groups/family_law/publications/family-advocate/2019/summer/assisted-reproductive-technology-law-10-faqs/',
  },
  abaSteps: {
    label: 'American Bar Association, Family Advocate, Melissa Lynne Torto, “Navigating the Early Steps of the Surrogacy Process” (Summer 2026)',
    url: 'https://www.americanbar.org/groups/family_law/resources/family-advocate/2026-summer/navigating-early-steps-surrogacy-process',
  },
  abaJournal: {
    label: 'ABA Journal, “Baby steps: acceptance of compensated surrogacy widens with Michigan law rewrite” (June 2024)',
    url: 'https://abajournal.com/magazine/article/baby-steps-acceptance-of-compensated-surrogacy-widens-with-michigan-law-rewrite',
  },
  s360: {
    label: 'Surrogacy360, United States surrogacy law map and state summaries (updated March 30, 2026)',
    url: 'https://surrogacy360.org/wp-content/uploads/2026/03/2026-S3-US-Map-Update_3.30.26.pdf',
  },
  klj: {
    label: 'Kentucky Law Journal Online, “Legal but Unregulated: An Overview of State Surrogacy Regulations (or Lack Thereof)” (November 2025)',
    url: 'https://www.kentuckylawjournal.org/blog/legal-but-unregulated-an-overview-of-state-surrogacy-regulations-or-lack-thereof',
  },
  cfcOrders: {
    label: 'Creative Family Connections (a surrogacy agency and law-referral service), “Pre-Birth vs Post-Birth Orders in Surrogacy” (March 2026)',
    url: 'https://creativefamilyconnections.com/blog/pre-birth-vs-post-birth-orders-in-surrogacy/',
  },
  dimov: {
    label: 'Dimov Tax (George Dimov, CPA), “Do You Have to Pay Taxes on Surrogacy Money?”',
    url: 'https://dimovtax.com/taxes-on-surrogacy-money/',
  },
  amsTax: {
    label: 'American Surrogacy (a surrogacy agency), “Is Surrogacy Income Taxable?”',
    url: 'https://www.americansurrogacy.com/surrogate/Is-surrogacy-income-taxable',
  },
  aaaa: {
    label: 'Academy of Adoption & Assisted Reproduction Attorneys (AAAA), attorney directory',
    url: 'https://adoptionart.org/',
  },
} as const;

/** Links to the other guides, shown near the end of each one. */
export const RELATED = {
  find: { label: 'How to find a surrogate without an agency', path: '/resources/find-a-surrogate-without-an-agency' },
  become: { label: 'How to become an independent surrogate', path: '/resources/become-an-independent-surrogate' },
  cost: { label: 'What independent surrogacy costs compared with an agency', path: '/resources/independent-surrogacy-cost' },
  pay: { label: 'How surrogate compensation works', path: '/resources/surrogate-compensation' },
  versus: { label: 'Independent surrogacy versus an agency', path: '/resources/independent-vs-agency-surrogacy' },
  legal: { label: 'The legal steps of a surrogacy journey', path: '/resources/surrogacy-legal-steps' },
  first: { label: 'The first conversation: what to ask before you match', path: '/resources/first-conversation' },
  after: { label: 'After the match: the steps of an independent journey', path: '/resources/after-the-match' },
} as const;
