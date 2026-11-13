/**
 * Article: "After the Match: The Steps of an Independent Journey".
 *
 * General information for people planning an independent surrogacy journey,
 * not legal, medical or financial advice. Seth reviewed the wording on
 * 2026-11-13 (sources list and the "Who pays" column left off by his choice).
 *
 * Same block format as firstConversation.ts, plus a 'table' block.
 */
import type { ArticleBlock } from '@/content/firstConversation';

export const AFTER_THE_MATCH_TITLE = 'After the Match: The Steps of an Independent Journey';

export const AFTER_THE_MATCH_INTRO =
  'What happens between "yes" and an embryo transfer: clearances, counseling, contracts, the mock cycle, and the transfer cycle, in the order most journeys follow.';

export const AFTER_THE_MATCH: ArticleBlock[] = [
  {
    kind: 'p',
    text: "Matching is the beginning, not the finish line. Between \"yes, let's do this\" and an embryo transfer there are usually four to six months of clearances, contracts, and medications, and each step has to happen in order. Most of the waiting is not anyone's fault. Clinics review records on their own schedule, attorneys draft and redline, and a uterus takes weeks to prepare.",
  },
  {
    kind: 'p',
    text: 'The order below is the one most journeys follow: OB-GYN clearance, fertility clinic screening, psychological evaluation and counseling, legal contracts, a mock cycle, then the real medication cycle and transfer. Clinics differ. Some do the psychological evaluation before the medical screening, some skip the mock cycle, and some will not even review records until a legal contract is signed. Ask your clinic for its own checklist at the start and follow that.',
  },
  {
    kind: 'note',
    text: "This applies to agency journeys too. An agency can coordinate these steps, book appointments, and chase paperwork, but it cannot do any of them for you. The surrogate still has to see her OB and the clinic, both sides still sit with a mental-health professional, two attorneys still have to negotiate a contract, and the surrogate's body still has to respond to the medications. The list is the same either way. What changes in an independent journey is that you are the coordinator.",
  },

  { kind: 'h2', text: 'Step 1: OB-GYN clearance' },
  {
    kind: 'p',
    text: "Typical time: 1 to 4 weeks. The surrogate's own OB-GYN, or the doctor who delivered her last baby, writes a short letter saying she is healthy enough to carry another pregnancy and has no objection to her becoming a gestational carrier. Fertility clinics generally want this letter, plus her records, before they will book a screening appointment.",
  },
  { kind: 'h3', text: 'What the surrogate does' },
  {
    kind: 'bullets',
    items: [
      'Books a visit with her OB-GYN and says plainly that she plans to be a gestational surrogate and needs a clearance letter. Many doctors have written one before. Some will not, and she may need a different OB.',
      'Signs medical-records releases so the clinic can get her prenatal flowsheets, labor and delivery summaries for every prior pregnancy, and her most recent well-woman exam and Pap result. Missing or scattered records are the most common cause of delay here, so start the requests the day you match.',
      "Confirms she meets the clinic's basic criteria. Most clinics follow American Society for Reproductive Medicine guidance: at least one uncomplicated full-term pregnancy and delivery, generally age 21 to about 45, a BMI inside the clinic's range, no more than a set number of prior C-sections, and usually six to twelve months since her last delivery or since she stopped breastfeeding.",
    ],
  },
  { kind: 'h3', text: 'What intended parents do' },
  {
    kind: 'bullets',
    items: [
      'Pick the fertility clinic now if you have not already, since the clinic tells you exactly what the letter and records must say.',
      'Offer to cover the OB visit copay and records fees. These are usually small and usually yours to pay.',
    ],
  },
  { kind: 'h3', text: 'Watch for' },
  {
    kind: 'bullets',
    items: [
      'A history of preeclampsia, preterm labor, gestational diabetes, postpartum hemorrhage, or postpartum depression. None is an automatic no, but the clinic will ask about each, so get ahead of it.',
      'A prior C-section. One is usually fine; two or more may be a stop for some clinics.',
      'Records from a hospital that has closed or changed systems. Ask early.',
    ],
  },

  { kind: 'h2', text: 'Step 2: Fertility clinic medical screening' },
  {
    kind: 'p',
    text: "Typical time: 4 to 8 weeks, including the records review. The intended parents' fertility clinic has the final say on whether a surrogate can carry for them, no matter what her OB said. The clinic's reproductive endocrinologist first reviews her records, usually taking one to four weeks, then books a screening day at the clinic.",
  },
  {
    kind: 'p',
    text: "The screening day usually takes several hours and often means travel to the intended parents' clinic. It typically includes:",
  },
  {
    kind: 'bullets',
    items: [
      'A physical exam and a consultation with the reproductive endocrinologist, who will go over her pregnancy history and the medications ahead.',
      'Transvaginal ultrasound to measure the uterus and check the ovaries.',
      'A saline sonogram (saline infusion sonohysterogram) or hysteroscopy to look for polyps, fibroids, or scar tissue. Some clinics use an HSG with X-ray dye instead.',
      'Bloodwork: thyroid, hormone levels, blood type, immunity to rubella and varicella, and a full infectious-disease panel (HIV, hepatitis B and C, syphilis, gonorrhea, chlamydia, and others required by FDA rules for third-party reproduction).',
      'A urine drug and nicotine screen.',
      'Often a mock embryo transfer, a quick pass of a catheter to map the path into the uterus so the real transfer goes smoothly.',
    ],
  },
  {
    kind: 'p',
    text: "Her partner is screened too. If the surrogate has a sexual partner, most clinics require that partner's infectious-disease bloodwork, and sometimes a drug screen, because the clinic has to know the pregnancy environment is safe. This is often forgotten and delays clearance by weeks.",
  },
  {
    kind: 'p',
    text: 'Intended parents are screened as well. If one or both intended parents are providing eggs or sperm, FDA rules require their own infectious-disease testing within a set window before the embryos were created or before transfer. If the embryos already exist, the clinic will check that the testing was done when they were made. Intended parents also usually have a consultation with the doctor.',
  },
  {
    kind: 'p',
    text: "Results and clearance typically come back within one to two weeks. The clinic then issues a written medical clearance, which the attorneys and the surrogate's insurance reviewer will ask for. If something is off, such as a polyp, a thin lining, or a lab result that needs a repeat, the clinic usually puts her on a 30- to 60-day hold rather than disqualifying her.",
  },
  {
    kind: 'p',
    text: "Who pays: the intended parents, including her travel, a companion's travel if she brings one, lost wages, and childcare for the screening day. Agree on this before the trip is booked.",
  },

  { kind: 'h2', text: 'Step 3: Psychological evaluation and counseling' },
  {
    kind: 'p',
    text: 'Typical time: 2 to 4 weeks to schedule and complete. Nearly every clinic requires a psychological evaluation of the surrogate, and most also require one for the intended parents and a joint session with everyone together. This is a professional standard from the American Society for Reproductive Medicine, and clinics will not transfer without it. Many clinics want it done before medical screening; others accept it any time before legal clearance.',
  },
  {
    kind: 'p',
    text: "The surrogate's evaluation is a 60- to 120-minute interview with a licensed mental-health professional who specializes in third-party reproduction, plus a written personality test, most often the PAI or MMPI. The clinician asks about her motivation, her support at home, her past pregnancies and how she felt afterward, her history of depression or anxiety, how she would handle a miscarriage, a termination decision, or bed rest, and whether she understands that this is the intended parents' child. Her spouse or partner is usually interviewed as well, either separately or together, because their support is part of the picture.",
  },
  {
    kind: 'p',
    text: "The intended parents' consultation is shorter and is not a test to pass. It covers how they came to surrogacy, whether they have grieved what they lost along the way, what they expect from the relationship with the surrogate, how they will handle decisions during the pregnancy, and what they plan to tell the child.",
  },
  {
    kind: 'p',
    text: 'The joint session brings both sides together with the clinician, sometimes in person, often by video. It walks through the hard scenarios one more time with a neutral third party in the room: termination, selective reduction, how many embryos, how much contact, who is in the delivery room. If you worked through the first-conversation questions, this will feel familiar. If you did not, this is where mismatches surface, which is still far better than finding them in the contract.',
  },
  {
    kind: 'p',
    text: 'The report goes to the clinic and, in summary form, to the attorneys. It states whether the clinician recommends proceeding and sometimes notes things to address in the contract. The surrogate does not usually see the full report.',
  },
  {
    kind: 'p',
    text: "Who pays: the intended parents. Expect several hundred to around a thousand dollars per evaluation, more if a written test is scored separately, plus the joint session. Find a clinician on your clinic's referral list, since not every therapist can do this.",
  },
  {
    kind: 'p',
    text: 'Many contracts also fund ongoing support for the surrogate: a set number of counseling sessions during the pregnancy and after delivery. Ask about it now so it is in the budget.',
  },

  { kind: 'h2', text: 'Step 4: Legal' },
  {
    kind: 'p',
    text: "Typical time: 4 to 8 weeks, and often longer. This is the step most people underestimate. Nothing medical can start until a signed gestational carrier agreement exists and the intended parents' attorney sends the clinic a legal clearance letter. Start the legal step the moment medical clearance looks likely. Do not wait for the clinic's written clearance to hire attorneys.",
  },
  {
    kind: 'p',
    text: "Two attorneys, both paid by the intended parents. Each side needs its own reproductive-law attorney, and the surrogate's attorney should be licensed in her state, since her state's law usually governs the contract and the birth. The intended parents' attorney drafts; the surrogate's attorney reviews it with her line by line. Expect a 30- to 50-page document.",
  },
  { kind: 'h3', text: 'What the contract covers' },
  {
    kind: 'bullets',
    items: [
      'Compensation: base fee, payment schedule (usually monthly starting at confirmed heartbeat), monthly allowance, maternity clothes, and every contingency fee (transfer, canceled cycle, C-section, multiples, invasive procedures, bed rest, lost wages for her and her partner, childcare, housekeeping, pumping, loss of reproductive organs).',
      'Medical terms: number of embryos per transfer, number of attempts, termination and selective reduction, invasive testing, who makes medical decisions, restrictions on travel, diet, substances, and intimacy.',
      "Insurance: whether her health plan covers a surrogate pregnancy, who buys a separate policy if not, life insurance for her, and who pays the baby's bills from birth.",
      'Relationship and privacy: communication, appointments, social media, who is in the delivery room, and contact after birth.',
      'Parentage: that the intended parents are the legal parents from birth, and how the pre-birth or post-birth order will be obtained.',
      'What happens if the intended parents separate or die, or if the surrogate is incapacitated.',
    ],
  },
  { kind: 'h3', text: 'Why it takes so long' },
  {
    kind: 'bullets',
    items: [
      'Each round of redlines goes attorney to client to attorney to the other attorney. Three rounds is normal. A week with no reply from anyone stalls everything.',
      "Insurance review. An attorney or a surrogacy insurance specialist reads the surrogate's actual policy for surrogacy exclusions and liens. Many employer plans exclude it. If a separate policy is needed, open-enrollment dates can push the whole timeline by months.",
      'Escrow setup. The contract names an escrow or trust company. The intended parents must fund it, often the full compensation plus several months of expenses, before the clearance letter is issued. Wires and account openings take days.',
      'Notarization and witnessing, and in some states court filing, add days at the end.',
      'Terms the two sides never talked about. Disagreement on a C-section fee or a termination clause at this stage can end a match. This is why the first-conversation questions matter.',
    ],
  },
  {
    kind: 'p',
    text: "The clearance letter. Two or three business days after both sides sign, the intended parents' attorney sends the clinic a letter saying the agreement is executed and escrow is funded. Only then will the clinic write the medication calendar.",
  },
  {
    kind: 'p',
    text: 'Cost: intended parents commonly pay a few thousand dollars for each attorney, plus escrow-company fees, and later a separate fee for the parentage order. Ask each attorney for a flat-fee quote before engaging them.',
  },

  { kind: 'h2', text: 'Step 5: Mock cycle' },
  {
    kind: 'p',
    text: "Typical time: 3 to 5 weeks. Not every clinic requires one. A mock cycle is a dress rehearsal of the medications without an embryo. The surrogate takes the same estrogen (and sometimes progesterone) she will take for the real transfer, and the clinic watches how her uterine lining responds. It answers one question: will this protocol get her lining thick enough, usually 7 to 8 millimeters or more with a healthy three-layer pattern, on the clinic's schedule?",
  },
  {
    kind: 'p',
    text: 'Who needs one. Some clinics order a mock cycle for every gestational carrier. Others skip it when the lining measured well during the screening ultrasound, or when she has carried for them before. A few combine it with an endometrial receptivity test (ERA biopsy) to fine-tune the day of transfer, though that is less common now.',
  },
  { kind: 'h3', text: 'What it looks like' },
  {
    kind: 'bullets',
    items: [
      'A baseline ultrasound and bloodwork on day two or three of her period.',
      'Estrogen for two to three weeks, as pills, patches, or injections.',
      "One or two monitoring visits, usually at a lab or clinic near her home, with the results sent to the intended parents' clinic.",
      'Sometimes a few days of progesterone at the end, and sometimes a biopsy.',
      'Then she stops the medications, has a withdrawal bleed, and the clinic adjusts the protocol if needed.',
    ],
  },
  {
    kind: 'p',
    text: 'Timing with legal. Many clinics will run the mock cycle before legal clearance because no embryo is involved, which saves a month. Ask. If yours will not, the mock cycle happens after the clearance letter and adds that month to the timeline.',
  },
  {
    kind: 'p',
    text: "Who pays: the intended parents cover the medications, monitoring, and any mock-cycle fee in the contract (often a few hundred dollars to her, plus the clinic's charges). Her lost wages and mileage for monitoring visits are usually covered as well.",
  },

  { kind: 'h2', text: 'Step 6: The transfer cycle' },
  {
    kind: 'p',
    text: 'Typical time: 6 to 8 weeks from the first pill to the pregnancy test. With legal clearance in hand, the clinic writes a medication calendar. The surrogate is not doing IVF in the egg-retrieval sense; the embryos already exist. Her job is to build a lining and hold it steady while the embryo implants.',
  },
  { kind: 'h3', text: 'The calendar, in order' },
  {
    kind: 'numbered',
    items: [
      'Suppression, 2 to 4 weeks. Birth control pills, Lupron injections, or both, to quiet her own cycle so the clinic controls the timing. Not every protocol uses this step.',
      'Baseline check. Ultrasound and bloodwork to confirm the ovaries are quiet and the lining is thin before building starts.',
      'Estrogen, 2 to 3 weeks. Pills, patches, or injections to grow the lining. One or two monitoring ultrasounds, usually at a clinic near her home with results sent to the IVF clinic. Target is roughly 7 to 8 mm or more.',
      'Progesterone, starting 5 to 7 days before transfer. Most clinics use daily progesterone-in-oil injections in the hip, sometimes with vaginal suppositories. The day progesterone starts fixes the transfer date, so travel gets booked now.',
      'Transfer day. A 10- to 20-minute procedure with a full bladder and no anesthesia. The embryologist thaws the embryo that morning and reports how it survived the thaw. The doctor passes a thin catheter through the cervix under ultrasound and places the embryo. She rests briefly and can usually fly home the next day. Most clinics now transfer a single embryo.',
      'The wait, 9 to 12 days. All medications continue. No home tests, or at least no decisions based on them.',
      'Beta hCG blood test, then a second one two days later to confirm the number is rising. A positive first beta is not yet a pregnancy; the doubling is what the clinic wants to see.',
      'First ultrasound at about 6 to 7 weeks to confirm a heartbeat and a single sac. This is usually the moment base compensation starts.',
      'Graduation to the OB. Once the heartbeat is confirmed and sometimes after a second scan, the clinic releases her to her own OB, somewhere between 8 and 10 weeks. Estrogen and progesterone taper off around 10 to 12 weeks, when the placenta takes over.',
    ],
  },
  { kind: 'h3', text: 'Intended parents during this step' },
  {
    kind: 'bullets',
    items: [
      'Confirm with the clinic which embryo will be transferred and that its storage and testing paperwork is in order.',
      'Plan to attend the transfer if the contract allows. Many surrogates want them there; some want quiet.',
      'Keep escrow topped up: the transfer fee, travel, lost wages, and the first monthly payments all land in these weeks.',
    ],
  },
  {
    kind: 'p',
    text: 'If the transfer fails. It happens, even with tested embryos. The clinic typically waits one or two cycles and tries again, sometimes with a changed protocol. The contract should already say how many attempts both sides agreed to and what is paid per attempt. Grieve it, and talk before deciding anything.',
  },

  { kind: 'h2', text: 'After the heartbeat: pregnancy, parentage, and birth' },
  {
    kind: 'p',
    text: 'Once the OB takes over, the pregnancy is medically an ordinary one. The surrogacy-specific work moves to the attorneys and to planning the birth.',
  },
  { kind: 'h3', text: 'First and second trimester' },
  {
    kind: 'bullets',
    items: [
      'Routine OB visits about every four weeks, then more often late. The contract says which ones the intended parents attend, in person or by video.',
      'The 20-week anatomy scan is the appointment most intended parents travel for.',
      'Any genetic screening (NIPT around 10 weeks, and whether to do invasive testing) follows what the contract and the joint counseling settled.',
      'The surrogate keeps records of mileage, copays, and lost work and submits them to escrow on the schedule in the contract.',
    ],
  },
  {
    kind: 'p',
    text: "Parentage order, usually filed in the second trimester. The intended parents' attorney files for a pre-birth parentage order where the delivery state allows it, typically between 20 and 32 weeks. The order tells the hospital and the vital-records office that the intended parents are the legal parents and belong on the birth certificate. States that do not allow pre-birth orders use a post-birth order filed within days of delivery, and a few require an adoption step. Both attorneys stay involved, and the surrogate (and her spouse) usually sign consents.",
  },
  {
    kind: 'p',
    text: "Hospital planning, third trimester. Someone has to tell the hospital a surrogate is delivering. Call the labor and delivery unit around 28 to 32 weeks, send the parentage order when it arrives, and agree on: who is in the room, whether the intended parents get their own room, who holds the baby first, skin-to-skin, cord blood, feeding plan, pumping, photos, and how the surrogate wants to say goodbye. Pre-register her and, if the hospital allows, the baby under the intended parents' names and insurance.",
  },
  {
    kind: 'p',
    text: "Insurance for the baby. The intended parents add the baby to their health plan within the plan's window after birth, usually 30 days. Until then the hospital bills under whatever was arranged in advance. Sort this out before 36 weeks.",
  },
  { kind: 'h3', text: 'Delivery and after' },
  {
    kind: 'bullets',
    items: [
      'Hospital stay of one to three days for a vaginal birth, three to five for a C-section. The surrogate recovers in her own room; the baby goes home with the intended parents when discharged.',
      "Final compensation, any C-section or multiples fees, and post-delivery lost wages are paid from escrow on the contract's schedule, often within four to six weeks.",
      'Her six-week postpartum visit, any pumping arrangement, and the counseling sessions the contract funds.',
      'The birth certificate arrives with the intended parents’ names if a pre-birth order was issued; otherwise after the post-birth order.',
      'Whatever ongoing contact you agreed to. Check in on her at two weeks and again at two months. The weeks after a surrogate birth are the quietest and sometimes the hardest.',
    ],
  },

  { kind: 'h2', text: 'The whole timeline at a glance' },
  {
    kind: 'p',
    text: 'Back to back, match to transfer is usually four to six months. Overlapping the steps where your clinic allows it can bring that closer to three.',
  },
  {
    kind: 'table',
    header: ['Step', 'Typical time', 'Who arranges it'],
    rows: [
      ['OB-GYN clearance letter and records', '1 to 4 weeks', 'Surrogate'],
      ['Clinic records review', '1 to 4 weeks', 'Clinic'],
      ['Clinic screening day and results', '1 day, plus 1 to 2 weeks', 'Clinic; surrogate travels'],
      ['Psychological evaluations and joint session', '2 to 4 weeks', 'Both sides book with a clinic-approved clinician'],
      ['Legal: contract, insurance review, escrow, clearance letter', '4 to 8 weeks or more', 'Both attorneys'],
      ['Mock cycle (if required)', '3 to 5 weeks', 'Clinic'],
      ['Transfer cycle to pregnancy test', '6 to 8 weeks', 'Clinic'],
      ['Heartbeat and release to OB', 'Weeks 6 to 10 of pregnancy', 'Clinic, then OB'],
      ['Parentage order', 'Filed around weeks 20 to 32', "Intended parents' attorney"],
      ['Hospital plan and pre-registration', 'Weeks 28 to 36', 'Both sides, with the hospital'],
      ['Delivery and final payments', 'Birth plus 4 to 6 weeks', 'Escrow company'],
    ],
  },
  { kind: 'h3', text: 'How to keep it moving' },
  {
    kind: 'bullets',
    items: [
      'Start records requests and attorney searches the week you match. Those two things are the long poles.',
      'Ask the clinic on day one for its written checklist and whether it will run the mock cycle before legal clearance.',
      "Get the surrogate's partner tested at the same visit as her screening.",
      "Have the surrogate's health insurance policy reviewed for a surrogacy exclusion before the contract is drafted, not after.",
      'Reply to attorney emails within a day. Most contract delay is people, not law.',
      'Fund escrow as soon as the contract is signed. The clearance letter waits on it.',
      'Keep one shared document with every date, result, and payment. Agencies keep this for their clients; in an independent journey one of you does.',
    ],
  },
  {
    kind: 'note',
    text: 'This article is general information for people planning an independent surrogacy journey. It is not medical, legal, or financial advice. Your fertility clinic and your attorneys set the requirements and the order for your journey, and both vary by clinic and by state.',
  },
];
