import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const VERSUS: Guide = {
  slug: 'independent-vs-agency-surrogacy',
  title: 'Independent Surrogacy Versus an Agency',
  intro: 'What an agency does, what you take on yourself in an independent journey, and how to decide which fits you.',
  description:
    'Independent surrogacy compared with using an agency: what each involves, what stays the same, the cost difference, the risks, and who each route suits.',
  blocks: [
    { kind: 'h2', text: 'What is the difference?' },
    {
      kind: 'p',
      text: 'In an agency journey, a surrogacy agency recruits and screens surrogates, proposes a match, and coordinates the steps that follow. In an independent journey, the intended parents and the surrogate find each other and coordinate it themselves. The clinic, the attorneys, the psychological evaluation and the contract are part of both.',
    },

    { kind: 'h2', text: 'What does an agency do?' },
    {
      kind: 'p',
      text: 'According to an American Bar Association article on choosing an agency, services differ: some agencies are full-service and others only match. Typical services include:',
    },
    {
      kind: 'bullets',
      items: [
        'finding surrogates and checking them before a match, including a background check and psychological evaluation;',
        'a structured matching process, usually one profile at a time, with a call before both sides accept;',
        'referrals to clinics, attorneys, escrow and insurance reviewers;',
        'coordinating appointments and paperwork, and stepping in when there is a disagreement;',
        'finding a new match if the first one ends, sometimes at extra cost.',
      ],
    },
    {
      kind: 'p',
      text: 'The same article suggests asking any agency about its experience, when its fees become non-refundable, and what a rematch costs.',
    },

    { kind: 'h2', text: 'Side by side' },
    {
      kind: 'table',
      header: ['', 'Independent', 'With an agency'],
      rows: [
        ['Finding a match', 'You search and choose yourselves', 'The agency proposes matches'],
        ['Agency fee', 'None', 'Published estimates run from $15,000 to $50,000'],
        ['Pre-screening before you meet', 'None, so do clinic and background checks early', 'Usually done by the agency'],
        ['Clinic screening and psychological evaluation', 'Required', 'Required'],
        ['Separate attorneys and a contract', 'Required', 'Required'],
        ['Coordination', 'You and the surrogate', 'An agency coordinator'],
        ['If the match ends', 'You search again', 'The agency rematches, under its terms'],
        ['Choice and pace', 'You set them', 'Often a wait for a match'],
      ],
    },

    { kind: 'h2', text: 'What stays the same either way?' },
    {
      kind: 'p',
      text: 'The safeguards. The American Society for Reproductive Medicine (ASRM) says every gestational carrier arrangement needs medical screening, a psychological evaluation of the carrier and her partner, counseling for the intended parents, a joint session, and independent legal counsel for each side. An agency can organise those steps. It cannot replace them, and skipping them is not what independent means.',
    },

    { kind: 'h2', text: 'What are the risks of going independent?' },
    {
      kind: 'p',
      text: 'The main one is finding a problem late. A surrogacy-center director quoted by The Bump warned that when medical tests or legal agreements are incomplete before the embryo transfer, arrangements can fall apart. Without an agency there is also no one in the middle when a hard conversation is needed, and no one who has pre-screened the person you are talking to.',
    },
    {
      kind: 'p',
      text: 'You can reduce these risks: ask the clinic for its criteria before you match, verify identity on video, hire the attorneys early, use escrow, and never send money to someone you met online.',
    },

    { kind: 'h2', text: 'Who does each route suit?' },
    {
      kind: 'bullets',
      items: [
        'Independent tends to suit people who already know their surrogate or intended parents, who have done a journey before, who are organised and comfortable handling direct conversations, or who cannot afford an agency fee.',
        'An agency tends to suit first-timers who want guidance, people short on time, and anyone who would rather have a professional between the two sides.',
        'There is a middle route. Some agencies offer a reduced service to families who bring their own surrogate. The Bump reported one center charging $10,000 for that in 2022, against $25,000 for a full match.',
      ],
    },

    { kind: 'h2', text: 'Can you look at both?' },
    {
      kind: 'p',
      text: 'Yes. Independent Journey lists independent members and agency-represented clients in the same place, each clearly labelled, so intended parents and surrogates can compare without committing to one route first. It is free to join, browse and message.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.find, RELATED.become, RELATED.cost, RELATED.legal] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SRC.abaSteps, SRC.asrm2022, SRC.asrmEthics2023, SRC.bump, SRC.axiosCost, SRC.goodrx] },
  ],
};
