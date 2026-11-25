import { CLOSING_NOTE, type Guide, RELATED, SRC } from './shared';

export const COMPENSATION: Guide = {
  slug: 'surrogate-compensation',
  title: 'How Surrogate Compensation Works',
  intro: 'Base compensation, the payments on top of it, how escrow pays it out, and what is known and not known about tax.',
  description:
    'How gestational surrogate pay works: published base compensation ranges, allowances and extra payments, escrow, state limits, and the unsettled tax question.',
  blocks: [
    { kind: 'h2', text: 'How much are surrogates paid?' },
    {
      kind: 'p',
      text: 'There is no set rate. Compensation is agreed between the surrogate and the intended parents and written into the gestational carrier agreement. Published ranges for base compensation include $30,000 to $65,000 (figures compiled by Carrot, reported by Axios in March 2026) and $30,000 to $60,000 (an agency director quoted by GoodRx in March 2024). Some agencies advertise more: Circle Surrogacy lists $55,000 to $70,000 or higher. GoodRx notes that surrogates who have carried before may ask for more.',
    },

    { kind: 'h2', text: 'What is paid on top of the base?' },
    {
      kind: 'p',
      text: 'Most agreements separate the base amount from other payments. Items that commonly appear, according to the sources below:',
    },
    {
      kind: 'bullets',
      items: [
        'An allowance for costs such as maternity clothing, groceries and housekeeping. GoodRx reports $3,000 to $7,000 and describes it as generally optional.',
        'Travel to the clinic, and childcare while the surrogate is at appointments.',
        'Lost wages for the surrogate, and sometimes for her partner, when work is missed.',
        'An extra payment for carrying twins.',
        'Life insurance for the surrogate, which GoodRx says is usually required.',
        'Counseling during and after the pregnancy.',
        'The surrogate’s own attorney. The ASRM Ethics Committee says intended parents covering this cost is acceptable and common.',
      ],
    },
    {
      kind: 'p',
      text: 'What matters is that every item is written down with an amount or a clear rule. Vague wording about expenses is one of the most common sources of disagreement later.',
    },

    { kind: 'h2', text: 'How and when is it paid?' },
    {
      kind: 'p',
      text: 'The usual arrangement is escrow: the intended parents place the funds with an independent escrow service before the embryo transfer, and the service pays the surrogate on the schedule in the contract, often in instalments during the pregnancy. The ASRM Ethics Committee notes that escrow accounts are increasingly used, and ASRM’s 2022 committee opinion says the legal agreement should address fees, expenses and escrow arrangements. New York’s surrogacy law goes further and requires escrow, according to Surrogacy360.',
    },
    {
      kind: 'p',
      text: 'The ASRM Ethics Committee also says compensation should not depend on the birth of a healthy child. A well-drafted contract says what is paid if a transfer fails, if there is a miscarriage, or if the pregnancy ends early.',
    },

    { kind: 'h2', text: 'Is it ethical to pay a surrogate?' },
    {
      kind: 'p',
      text: 'The ASRM Ethics Committee’s 2023 opinion states that compensation for gestational carriers is ethically permissible, provided it does not create undue inducement or a risk of exploitation. Clinics screen for this: using compensation to solve one’s own infertility, and financial or emotional coercion, are listed by ASRM as reasons a candidate may be turned down.',
    },

    { kind: 'h2', text: 'Do all states allow compensation?' },
    {
      kind: 'p',
      text: 'No. Most states allow some form of compensated gestational surrogacy, according to the ABA Journal, but there are exceptions. Nebraska law treats compensated surrogacy contracts as void and unenforceable. Louisiana prohibits compensation, although a surrogate’s medical expenses may be covered. Surrogacy360 also lists states that limit payments to expenses or reasonable costs, including Virginia, Wyoming and Tennessee. The law changes: Michigan, long the strictest state, rewrote its law in 2024 to allow compensated agreements. Ask an attorney licensed in the surrogate’s state before agreeing an amount.',
    },

    { kind: 'h2', text: 'Is surrogate compensation taxable?' },
    {
      kind: 'p',
      text: 'This is unsettled, and you need a tax professional. Two things can be said with confidence. First, the general rule in federal tax law is that income from any source is taxable unless an exception applies. Second, the tax and surrogacy sources we checked agree that the IRS has not published guidance written specifically for a gestational surrogate’s compensation.',
    },
    {
      kind: 'p',
      text: 'Within that gap, the sources agree on the direction: base compensation is likely to be treated as income, while documented reimbursement of actual expenses is treated differently and is less clear. Whether a tax form such as a 1099 is issued depends on who makes the payment, and practice varies between escrow companies and agencies. Not receiving a form does not by itself mean the money is tax-free.',
    },
    {
      kind: 'p',
      text: 'Practical steps: speak to a CPA before you sign, ask how each line of the compensation package would be treated, keep records and receipts, and consider setting money aside until you have an answer.',
    },

    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.become, RELATED.cost, RELATED.legal, RELATED.first] },

    CLOSING_NOTE,
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SRC.axiosCost, SRC.goodrx, SRC.circle, SRC.asrmEthics2023, SRC.asrm2022, SRC.abaJournal, SRC.s360, SRC.dimov, SRC.amsTax] },
  ],
};
