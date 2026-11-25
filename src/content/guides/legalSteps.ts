import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const LEGAL_STEPS: Guide = {
  slug: 'surrogacy-legal-steps',
  title: 'The Legal Steps of a Surrogacy Journey',
  intro: 'Attorneys, the gestational carrier agreement, escrow, and the court order that makes the intended parents the legal parents.',
  description:
    'The legal steps in United States gestational surrogacy: separate attorneys, the carrier agreement, escrow, pre-birth and post-birth parentage orders, and state differences.',
  blocks: [
    { kind: 'h2', text: 'Is surrogacy legal in the United States?' },
    {
      kind: 'p',
      text: 'There is no single national surrogacy law. Each state sets its own rules, and they differ a lot. Surrogacy360 figures reported by Axios in March 2026 count 31 states where gestational surrogacy agreements are enforceable, with some limitations, 17 where the practice is unregulated, and one where agreements are void. The American Society for Reproductive Medicine’s legal group calls this a rapidly evolving area of law. That is why the first legal step is always a lawyer who practises in the right state.',
    },

    { kind: 'h2', text: 'What are the legal steps, in order?' },
    {
      kind: 'numbered',
      items: [
        'Each side hires its own reproductive attorney.',
        'The attorneys confirm that the states involved allow the arrangement you have in mind.',
        'The attorneys draft and negotiate the gestational carrier agreement, and everyone signs.',
        'Escrow is funded and insurance is confirmed.',
        'The attorneys tell the clinic the legal work is complete, and the medical cycle begins.',
        'During the pregnancy or after the birth, depending on the state, a court confirms the intended parents as the legal parents.',
        'The birth certificate is issued, and any remaining steps (such as an adoption by a parent who is not genetically related, where a state requires it) are completed.',
      ],
    },

    { kind: 'h2', text: 'Does each side need its own lawyer?' },
    {
      kind: 'p',
      text: 'Yes. The American Society for Reproductive Medicine (ASRM) says each participant or couple must have independent legal counsel licensed in the applicable state. Its Ethics Committee adds that the surrogate’s lawyer owes a duty to her alone, and that it is acceptable and common for the intended parents to pay that lawyer’s fee.',
    },
    {
      kind: 'p',
      text: 'Choose a specialist. An American Bar Association article on the surrogacy process advises that these matters should not be handled by a general practitioner, and that more than one attorney may be needed depending on where the surrogate lives or plans to deliver. The Academy of Adoption & Assisted Reproduction Attorneys keeps a directory.',
    },

    { kind: 'h2', text: 'What does the gestational carrier agreement cover?' },
    {
      kind: 'p',
      text: 'Drawing on the American Bar Association’s frequently asked questions on assisted reproduction law and on ASRM’s recommendations, an agreement normally covers:',
    },
    {
      kind: 'bullets',
      items: [
        'that the surrogate is not, and does not intend to be, the parent, and that the intended parents are;',
        'embryo transfers: how many attempts and how many embryos;',
        'termination, selective reduction and medical emergencies;',
        'the surrogate’s health care and her right to make her own medical decisions;',
        'compensation, expenses and the escrow arrangement;',
        'health insurance, life insurance and who pays uncovered medical costs;',
        'which state’s law governs, usually the state where the surrogate will give birth.',
      ],
    },

    { kind: 'h2', text: 'When does the contract have to be signed?' },
    {
      kind: 'p',
      text: 'Before the medical cycle. ASRM says the psychological evaluation comes before legal counseling and contracts, and in common practice clinics wait for the attorneys’ confirmation (often called legal clearance) before starting the surrogate’s medications. A few states add a court step first: Texas and Utah, for example, require a court to validate the agreement, according to Surrogacy360. Ask your clinic and attorney what applies to you, and do not begin medications on a promise that the paperwork will follow.',
    },

    { kind: 'h2', text: 'What is a pre-birth order?' },
    {
      kind: 'p',
      text: 'A pre-birth order is a court order, obtained during the pregnancy, that establishes the intended parents as the legal parents from the moment of birth. The American Bar Association’s FAQ says such orders are available in most parts of the United States. A surrogacy legal service reports they are most often obtained in the second trimester and that courts usually review a statement from the fertility clinic’s physician.',
    },

    { kind: 'h2', text: 'What is a post-birth order?' },
    {
      kind: 'p',
      text: 'In some states the court step can only happen after the baby is born. Until that order is final, the surrogate may be treated as the legal parent, and the process can involve a parentage petition, genetic testing or an adoption. Where one intended parent is not genetically related to the child, some states require that parent to adopt. Your attorney will know which route your state uses and how long it takes.',
    },

    { kind: 'h2', text: 'Which state’s law applies?' },
    {
      kind: 'p',
      text: 'Usually the state where the baby will be born, which is normally where the surrogate lives. The intended parents’ home state matters too, because the family has to be recognised there afterwards. Some states also set residency requirements for the surrogate or the intended parents. This is the reason a match across state lines needs a legal check before anyone commits.',
    },

    { kind: 'h2', text: 'Which states are restrictive?' },
    {
      kind: 'p',
      text: 'The details change, so treat this as a prompt for a conversation with an attorney and not as a list to rely on. As of the sources checked for this guide:',
    },
    {
      kind: 'bullets',
      items: [
        'Nebraska treats compensated surrogacy contracts as void and unenforceable (Surrogacy360, Kentucky Law Journal, ABA Journal).',
        'Louisiana enforces only uncompensated agreements for married couples using their own egg and sperm, with court approval in advance (Surrogacy360, Kentucky Law Journal, ABA Journal).',
        'Indiana law declares surrogacy contracts void and unenforceable, although Surrogacy360 notes that courts there have sometimes recognised intended parents.',
        'Several states that do enforce agreements limit who can use them, for example to married intended parents or to those with a genetic link to the child. Texas, Utah and Virginia are examples given by Surrogacy360.',
        'Michigan, previously the strictest state, rewrote its law in 2024 to permit compensated agreements.',
      ],
    },

    { kind: 'h2', text: 'What does the legal work cost?' },
    {
      kind: 'p',
      text: 'Published estimates for legal fees range from $8,000 to $16,000 (GoodRx, 2024) to $15,000 to $20,000 (Carrot figures reported by Axios, 2026). Ask for a flat fee that names what is included: drafting, review, and the parentage order.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.after, RELATED.find, RELATED.become, RELATED.pay] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    {
      kind: 'sources',
      items: [SRC.asrm2022, SRC.asrmEthics2023, SRC.abaFaq, SRC.abaSteps, SRC.asrmStates, SRC.axiosStates, SRC.s360, SRC.klj, SRC.abaJournal, SRC.cfcOrders, SRC.axiosCost, SRC.goodrx, SRC.aaaa],
    },
  ],
};
