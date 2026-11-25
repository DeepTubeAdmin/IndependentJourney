import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const FIND_SURROGATE: Guide = {
  slug: 'find-a-surrogate-without-an-agency',
  title: 'How to Find a Surrogate Without an Agency',
  intro: 'What an independent match is, where intended parents find surrogates on their own, and the professionals you still need.',
  description:
    'How intended parents find a gestational surrogate without an agency: where to look, how to screen, the professionals you still need, and the risks to plan for.',
  blocks: [
    { kind: 'h2', text: 'Can you find a surrogate without an agency?' },
    {
      kind: 'p',
      text: 'Yes. It is usually called independent surrogacy: the intended parents and the gestational surrogate find each other and work together directly, without a surrogacy agency in the middle. A fertility clinic still does the medical work, and each side still has its own attorney. What you take on yourself is the matching and the coordinating that an agency would otherwise be paid to do.',
    },
    {
      kind: 'p',
      text: 'Independent does not mean informal. The medical screening, the psychological evaluation, the legal contract and the court steps are the same whether or not an agency is involved.',
    },

    { kind: 'h2', text: 'Where do intended parents find a surrogate on their own?' },
    {
      kind: 'bullets',
      items: [
        'People you already know. A relative or friend who offers to carry.',
        'Matching sites built for it. Independent Journey lets intended parents and surrogates create free profiles, browse each other, and message directly. Profiles show whether a member is independent or represented by an agency.',
        'Online communities. Surrogacy groups on social media are active, but nobody checks who is behind an account, so be more careful there.',
        'Referrals. Fertility clinics and reproductive attorneys sometimes know surrogates who have completed a journey and want to do another.',
      ],
    },

    { kind: 'h2', text: 'What should you look for in a surrogate?' },
    {
      kind: 'p',
      text: 'Your fertility clinic makes the medical decision, not you and not a website. Most United States clinics follow the recommendations of the American Society for Reproductive Medicine (ASRM). Its 2022 committee opinion says a gestational carrier should be of legal age and preferably between 21 and 45, should ideally have had at least one full-term, uncomplicated pregnancy, should ideally have had no more than five previous deliveries or three cesarean deliveries, and must have a stable family environment with adequate support.',
    },
    {
      kind: 'p',
      text: 'Clinics often add their own rules on top (for example on body mass index or time since the last birth), so ask your clinic for its written criteria before you spend weeks getting to know someone who cannot be approved.',
    },
    {
      kind: 'p',
      text: 'Beyond eligibility, you are looking for agreement on the questions that end matches later: views on termination and selective reduction, how many embryos to transfer, how much contact everyone wants, compensation, and where she would deliver.',
    },

    { kind: 'h2', text: 'What are the steps after you find someone?' },
    {
      kind: 'numbered',
      items: [
        'Talk, more than once. Start with messages, then a video call. Cover the hard subjects early.',
        'Confirm identity. Meet on live video, and expect to confirm details through each other’s clinic or attorney. A Verified label on a profile means a photo ID was checked; it is not a background check and it does not replace your own checks.',
        'Each side hires a reproductive attorney licensed in the right state. ASRM says each party must have independent legal counsel.',
        'Clinic screening. The clinic reviews her records and examines her. ASRM requires a psychological evaluation of the surrogate and her partner, counseling for the intended parents, and a joint session before treatment.',
        'Sign the gestational carrier agreement, drafted and negotiated by the two attorneys.',
        'Fund escrow, confirm insurance, and only then begin the medication cycle and embryo transfer.',
        'Complete the parentage steps your state requires, before or after the birth.',
      ],
    },

    { kind: 'h2', text: 'Which professionals do you still need without an agency?' },
    {
      kind: 'bullets',
      items: [
        'A fertility clinic for screening and the embryo transfer.',
        'Two reproductive attorneys, one for the intended parents and one for the surrogate. The ASRM Ethics Committee says the surrogate needs separate, independent counsel whose duty is to her alone, and that it is acceptable and common for intended parents to pay for it.',
        'A mental-health professional experienced in gestational carrier evaluations.',
        'An escrow service to hold and release payments. The ASRM Ethics Committee notes escrow accounts are increasingly used.',
        'An insurance review, to learn whether her health plan covers a surrogate pregnancy.',
      ],
    },

    { kind: 'h2', text: 'What are the risks of going without an agency?' },
    {
      kind: 'p',
      text: 'You are the coordinator, so the things an agency would catch are yours to catch. A surrogacy-center director quoted by The Bump put the main risk this way: if medical tests or legal agreements are not finished before the embryo transfer, the arrangement can fall apart. An attorney quoted in the same article advised staying cautiously optimistic until every clearance is complete.',
    },
    {
      kind: 'bullets',
      items: [
        'Scams. Never send money to someone you met online. Payments belong in escrow, after a signed contract.',
        'Screening gaps. Nobody has pre-screened the person you are talking to. The clinic and the psychological evaluation do that work, so do them early.',
        'State law. Some states restrict or refuse to enforce surrogacy contracts. Ask an attorney about the state where the surrogate lives and would deliver before you commit.',
        'No rematch service. If a match ends, you start the search again yourself.',
      ],
    },

    { kind: 'h2', text: 'How much can you save?' },
    {
      kind: 'p',
      text: 'The saving is the agency fee. Published estimates of that fee differ: figures compiled by the fertility-benefits company Carrot and reported by Axios in March 2026 put it at $15,000 to $45,000, and an agency founder quoted by GoodRx in 2024 put it at $30,000 to $50,000. Everything else (the clinic, the attorneys, insurance, and the surrogate’s compensation) still has to be paid.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.cost, RELATED.versus, RELATED.legal, RELATED.first, RELATED.after] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SRC.asrm2022, SRC.asrmEthics2023, SRC.bump, SRC.axiosCost, SRC.goodrx, SRC.asrmStates] },
  ],
};
