import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const BECOME_SURROGATE: Guide = {
  slug: 'become-an-independent-surrogate',
  title: 'How to Become an Independent Surrogate',
  intro: 'What clinics look for, the steps from first message to embryo transfer, and how to protect yourself without an agency.',
  description:
    'How to become a gestational surrogate without an agency: the usual medical requirements, the steps, your own attorney, escrow, and the safety checks to make.',
  blocks: [
    { kind: 'h2', text: 'What is an independent surrogate?' },
    {
      kind: 'p',
      text: 'An independent surrogate (also called an independent gestational carrier) matches with intended parents directly, without a surrogacy agency. You still go through a fertility clinic, a psychological evaluation and a legal contract. The difference is that you and the intended parents choose each other and coordinate the journey yourselves.',
    },
    {
      kind: 'p',
      text: 'This guide is about gestational surrogacy, where the embryo is created from the intended parents’ or donors’ egg and sperm, and the surrogate is not genetically related to the baby.',
    },

    { kind: 'h2', text: 'Who can be a surrogate?' },
    {
      kind: 'p',
      text: 'The fertility clinic decides. Most clinics start from the American Society for Reproductive Medicine (ASRM) recommendations. Its 2022 committee opinion says a gestational carrier:',
    },
    {
      kind: 'bullets',
      items: [
        'must be of legal age, and preferably between 21 and 45 years old;',
        'should ideally have had at least one full-term, uncomplicated pregnancy;',
        'should ideally have had no more than five previous deliveries, and no more than three by cesarean section;',
        'must have a stable family environment with adequate support.',
      ],
    },
    {
      kind: 'p',
      text: 'These are recommendations, and several are worded as “ideally”. Individual clinics set their own limits, often including body mass index, tobacco use and time since your last delivery, and some states set rules of their own. New York’s health department guidelines, for example, require a surrogate to be between 21 and 45. Ask the intended parents’ clinic for its criteria early.',
    },

    { kind: 'h2', text: 'What are the steps?' },
    {
      kind: 'numbered',
      items: [
        'Decide what you want: the kind of family you would carry for, your views on termination and selective reduction, how many embryos, how much contact, and your compensation.',
        'Create a profile and talk to intended parents. Move from messages to a video call before you agree to anything.',
        'Get your own attorney. The ASRM Ethics Committee says a gestational carrier needs separate, independent legal counsel whose duty is to her alone. It says intended parents paying for that lawyer is acceptable and common.',
        'Medical screening at the intended parents’ clinic, including a review of your pregnancy and delivery records.',
        'Psychological evaluation. ASRM requires an evaluation and counseling for the carrier and her partner or main support person, and a joint session with the intended parents.',
        'Negotiate and sign the gestational carrier agreement.',
        'Escrow is funded, insurance is confirmed, and the medication cycle and embryo transfer follow.',
      ],
    },

    { kind: 'h2', text: 'How do I stay safe without an agency?' },
    {
      kind: 'bullets',
      items: [
        'Choose your own lawyer. Do not share one with the intended parents, even if they are paying.',
        'Do not start medications before your attorney tells you the contract is signed and in effect.',
        'Insist on escrow. Your compensation and expenses should sit with an independent escrow service before the transfer, not in a promise.',
        'Know that medical decisions about your body stay yours. The ASRM Ethics Committee says gestational carriers have autonomy over their own medical care and are the sole source of consent for it.',
        'Have your health insurance reviewed for surrogacy exclusions, and make sure the contract says who pays if something is not covered.',
        'Never pay a fee to be matched, and be wary of anyone who rushes you, avoids video, or asks you for money.',
      ],
    },

    { kind: 'h2', text: 'Does it matter which state I live in?' },
    {
      kind: 'p',
      text: 'Yes, a great deal. Surrogacy is governed by state law, and the state where you live and deliver usually decides how parentage is established and whether a compensated agreement can be enforced. Most states allow some form of compensated gestational surrogacy, but a few restrict it. Nebraska treats compensated surrogacy contracts as void and unenforceable, and Louisiana enforces only uncompensated agreements for married couples using their own egg and sperm, according to both Surrogacy360 and the ABA Journal. Talk to a reproductive attorney licensed in your state before you match.',
    },

    { kind: 'h2', text: 'How much do independent surrogates earn?' },
    {
      kind: 'p',
      text: 'There is no standard rate. You and the intended parents agree the amount, and it is written into the contract. Published ranges for a surrogate’s base compensation in agency journeys run from about $30,000 to $65,000 (Carrot figures reported by Axios, March 2026), with some agencies advertising more. See our compensation guide for what is usually paid on top of the base and how it is paid out.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.pay, RELATED.legal, RELATED.versus, RELATED.first, RELATED.after] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SRC.asrm2022, SRC.asrmEthics2023, SRC.nyDoh, SRC.s360, SRC.abaJournal, SRC.axiosCost] },
  ],
};
