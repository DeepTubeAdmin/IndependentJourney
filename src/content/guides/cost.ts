import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const COST: Guide = {
  slug: 'independent-surrogacy-cost',
  title: 'What Independent Surrogacy Costs Compared With an Agency',
  intro: 'The main costs of a surrogacy journey, which of them an independent match removes, and which stay the same.',
  description:
    'Published cost ranges for surrogacy in the United States, with sources: agency fees, surrogate compensation, legal, medical and insurance, and what going independent changes.',
  blocks: [
    { kind: 'h2', text: 'How much does surrogacy cost in the United States?' },
    {
      kind: 'p',
      text: 'Published estimates vary widely, because journeys vary widely. Figures compiled by the fertility-benefits company Carrot and reported by Axios in March 2026 put the total at $100,000 to more than $250,000. An agency director quoted by GoodRx in March 2024 gave $150,000 to $200,000. Treat any single number, including these, as a starting point for your own budget and not as a quote.',
    },

    { kind: 'h2', text: 'What are the main costs?' },
    {
      kind: 'p',
      text: 'The table shows what two independent publications and one agency have published. The ranges do not match each other, which is the honest picture: costs depend on the clinic, the state, the surrogate, and how many transfers are needed.',
    },
    {
      kind: 'table',
      header: ['Cost', 'Axios / Carrot (2026)', 'GoodRx (2024)', 'Circle Surrogacy, an agency (2026)'],
      rows: [
        ['Agency fee', '$15,000 to $45,000', '$30,000 to $50,000', 'About $20,000 to $40,000'],
        ['Surrogate base compensation', '$30,000 to $65,000', '$30,000 to $60,000', '$55,000 to $70,000 or more'],
        ['Legal fees', '$15,000 to $20,000', '$8,000 to $16,000', '$3,000 to $15,000'],
        ['IVF and medical', '$25,000 to $50,000', 'About $20,000 to $30,000 for IVF', 'Up to $25,000'],
        ['Surrogacy health insurance, if needed', 'About $30,000', 'Up to $30,000', '$15,000 to $30,000'],
      ],
    },
    {
      kind: 'p',
      text: 'Other items that appear in budgets include allowances for things like maternity clothing, travel to the clinic and childcare, life insurance for the surrogate, lost wages, counseling, and extra payments for twins. Donor eggs, if you need them, are a separate cost that GoodRx put at $15,000 to $30,000.',
    },

    { kind: 'h2', text: 'What does going independent remove?' },
    {
      kind: 'p',
      text: 'The agency fee. That is the one large line that disappears, and on the published figures above it is somewhere between $15,000 and $50,000. Axios notes that working with a surrogate you already know can eliminate fees, while bringing emotional and legal complexities of its own.',
    },
    {
      kind: 'p',
      text: 'Some agencies also sell a reduced service for families who have already found their surrogate. The Bump reported in 2022 that one New York surrogacy center charged $25,000 for a match and $10,000 for a family bringing its own carrier.',
    },

    { kind: 'h2', text: 'What stays the same?' },
    {
      kind: 'bullets',
      items: [
        'The fertility clinic: screening, medications, and the embryo transfer.',
        'Two attorneys. The American Society for Reproductive Medicine (ASRM) says each party must have independent legal counsel, and intended parents commonly pay for both.',
        'The psychological evaluation and counseling that ASRM requires.',
        'The surrogate’s compensation and expenses, agreed between you.',
        'Health insurance that covers the pregnancy, and usually life insurance for the surrogate.',
        'Escrow fees, and the court costs of establishing parentage.',
      ],
    },

    { kind: 'h2', text: 'Is independent surrogacy always cheaper?' },
    {
      kind: 'p',
      text: 'Not always. The agency fee pays for screening, coordination and experience, and without it the mistakes are yours to pay for. A match that fails at medical screening after the attorneys have started, an insurance exclusion found late, or a contract that leaves a cost undefined can each use up part of the saving. Independent journeys tend to cost less when both sides do the early checks in the right order: clinic criteria first, then insurance, then lawyers.',
    },

    { kind: 'h2', text: 'How do you build a realistic budget?' },
    {
      kind: 'numbered',
      items: [
        'Ask your clinic for a written fee schedule for a gestational carrier cycle, including a second transfer.',
        'Ask two reproductive attorneys for flat-fee quotes covering the contract and the parentage order.',
        'Have the surrogate’s health plan reviewed, and price a replacement policy if it excludes surrogacy.',
        'Agree the full compensation package in writing, not only the base amount.',
        'Add escrow fees and a reserve for the unexpected, such as bed rest, a cesarean delivery or a repeat transfer.',
      ],
    },

    { kind: 'h2', text: 'What does Independent Journey cost?' },
    {
      kind: 'p',
      text: 'Nothing. Profiles, browsing and messaging are free for intended parents and surrogates, and we charge no match fee. We do not handle money between members.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.pay, RELATED.versus, RELATED.find, RELATED.legal] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SRC.axiosCost, SRC.goodrx, SRC.circle, SRC.bump, SRC.asrm2022, SRC.asrmEthics2023] },
  ],
};
