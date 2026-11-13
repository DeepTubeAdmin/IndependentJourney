/**
 * Article: "The First Conversation: What to Ask Before You Match".
 *
 * Written for the Resources page. It is general information for people
 * considering an independent surrogacy match, not legal, medical or
 * financial advice. Seth reviewed the wording on 2026-11-13.
 *
 * The article is stored as a list of simple blocks so the page can render it
 * with plain React Native text (no markdown library needed). To edit the
 * article, change the text here; the page itself needs no changes.
 */

export type ArticleBlock =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

export const FIRST_CONVERSATION_TITLE = 'The First Conversation: What to Ask Before You Match';

export const FIRST_CONVERSATION_INTRO =
  'A conversation checklist for the first call between a surrogate and intended parents, with the hard questions first.';

export const FIRST_CONVERSATION: ArticleBlock[] = [
  {
    kind: 'p',
    text: 'The first real conversation between a surrogate and intended parents decides more than any profile can. Profiles tell you who someone is on paper. The call tells you whether you can make hard decisions together when a pregnancy does not go to plan.',
  },
  {
    kind: 'p',
    text: 'Most people spend that first call on the easy things: hobbies, kids, why surrogacy. Those matter. But the matches that fall apart later almost always fall apart over a question nobody asked early: termination, how many embryos to transfer, what happens on bed rest, who is in the delivery room. So ask the hard questions on the first or second call, before anyone is attached. A match that ends after one honest conversation costs an hour. A match that ends after a signed contract and a failed transfer costs months and real money.',
  },
  {
    kind: 'p',
    text: 'This guide is a conversation checklist, not a script and not advice. You will not get through all of it in one call, and you should not try. Pick the sections that matter most to you, write down the answers, and bring the rest to a second call. Your attorneys and clinic will turn what you agree on into a contract and a treatment plan.',
  },

  { kind: 'h2', text: 'Setting up the call' },
  {
    kind: 'p',
    text: 'Use video, not just phone. You are deciding whether to trust someone with a pregnancy or with your embryos. Seeing a face, a home, and a partner tells you things a voice cannot. Keep the first call on video; move to personal phone numbers once you both want to continue.',
  },
  {
    kind: 'p',
    text: 'Include partners. If the surrogate has a spouse or partner, they should be on at least part of the call. Their support, their questions, and their comfort with the arrangement matter as much as hers. Both intended parents should be present too.',
  },
  {
    kind: 'p',
    text: 'Plan for 60 to 90 minutes. Agree in advance that this is the first of two or three conversations, so nobody feels rushed to decide.',
  },
  {
    kind: 'p',
    text: 'Bring notes. Each side should arrive with their own list of must-haves and deal-breakers, written down before the call so emotion does not soften them in the moment.',
  },
  {
    kind: 'p',
    text: 'Start with the easy things. Spend the first ten minutes on families, work, why surrogacy, what a good day looks like. Then say out loud: "Can we go through the hard questions now, while it is still easy to say no?" Naming it makes it normal.',
  },
  {
    kind: 'p',
    text: 'Write down the answers. Memory is unreliable and attorneys will ask. A shared document that both sides can see after the call prevents "I thought we agreed" later.',
  },

  { kind: 'h2', text: 'The hard questions, first' },
  {
    kind: 'p',
    text: 'These are the questions people avoid because they are uncomfortable, and they are exactly the ones that end matches after a contract is signed. A mismatch on any one of them is a reason not to match, no matter how much you like each other. Ask them early, answer them honestly, and do not try to talk anyone out of their position.',
  },
  { kind: 'h3', text: 'Termination and selective reduction' },
  {
    kind: 'bullets',
    items: [
      'If a serious or fatal fetal condition is found, would you terminate? Would you carry to term? Who decides?',
      "If a continued pregnancy threatened the surrogate's life or long-term health, what happens?",
      'If the pregnancy is twins or triplets, are you open to selective reduction? Under what circumstances?',
      'Are there any conditions, such as Down syndrome, where your answers differ?',
      "Does your faith or your family's views affect any of these answers?",
      'What if the intended parents want termination and the surrogate refuses, or the reverse? Do you understand that a contract cannot force anyone to have or not have a procedure?',
    ],
  },
  { kind: 'h3', text: 'Embryos and transfer' },
  {
    kind: 'bullets',
    items: [
      'How many embryos would you transfer at once? Most clinics now recommend a single embryo transfer. Does everyone agree?',
      'If the first transfer fails, how many attempts are you each willing to try? What is the limit before you stop?',
      "Whose embryos are they: the intended parents' own, donor egg, donor sperm, or both? Are they genetically tested? Have they been frozen, and for how long?",
      'Would you be willing to carry twins if a single embryo splits?',
      'What happens to remaining embryos if the match ends?',
    ],
  },
  { kind: 'h3', text: 'Testing and medical decisions' },
  {
    kind: 'bullets',
    items: [
      'Are you comfortable with invasive testing such as amniocentesis or CVS if a doctor recommends it?',
      "Who has the final say on medical decisions during pregnancy: the surrogate, the intended parents, or the doctor? Do both sides understand that the surrogate controls her own body and the intended parents' authority is through the contract and the clinic?",
      "Which fertility clinic and which OB would you use? Is the surrogate willing to use the intended parents' clinic, even if it means travel?",
      'Have you had a prior pregnancy with complications: preterm birth, preeclampsia, gestational diabetes, postpartum depression, placenta issues? Would the clinic approve you?',
    ],
  },
  { kind: 'h3', text: 'When things go wrong' },
  {
    kind: 'bullets',
    items: [
      'If there is a miscarriage, how will you each want to handle it, and how will you communicate?',
      'If the surrogate is put on bed rest for weeks, what happens to her job, her children, and her income?',
      'If one intended parent dies, or the couple separates, during the pregnancy, who takes the baby?',
      'If the baby is born with a disability, do the intended parents commit to taking the child home? Say it out loud. Both sides need to hear a clear yes.',
      'If the surrogate is seriously injured or dies, what is the plan for her family? Is there life insurance in the agreement?',
    ],
  },

  { kind: 'h2', text: 'Pregnancy and daily life' },
  {
    kind: 'p',
    text: "A surrogacy contract usually sets rules for nine months of someone's ordinary life. Talk through them now so nobody is surprised by a clause later.",
  },
  { kind: 'h3', text: 'Food, drink, and substances' },
  {
    kind: 'bullets',
    items: [
      'Any expectations about diet: organic food, caffeine limits, deli meat, sushi, soft cheese?',
      'Alcohol and nicotine: none at all, or none after transfer? What about a partner who smokes or vapes at home?',
      'Marijuana, even where legal? CBD?',
      'Prescription and over-the-counter medicines: will the surrogate tell the intended parents before taking anything new? Who pays for them?',
      'Hair dye, nail salons, hot tubs, saunas, tattoos: does anyone have rules about these?',
    ],
  },
  { kind: 'h3', text: 'Work, exercise, and activity' },
  {
    kind: 'bullets',
    items: [
      'What does the surrogate do for work? Is it physical, on her feet, around chemicals, or stressful?',
      'How much exercise is she used to? Any limits on running, lifting, cycling, horseback riding, skiing?',
      'Will she keep working through the third trimester? What if her doctor says stop?',
      'Any travel for work?',
    ],
  },
  { kind: 'h3', text: 'Travel' },
  {
    kind: 'bullets',
    items: [
      'Will the surrogate avoid air travel after a certain week? Most contracts restrict travel late in pregnancy and out of state near delivery.',
      'Any trips already planned during the pregnancy window? International travel, cruises, areas with Zika or other disease risks?',
      'How far does she live from the hospital, and from the intended parents?',
    ],
  },
  { kind: 'h3', text: 'Vaccines and illness' },
  {
    kind: 'bullets',
    items: [
      'Which vaccines is the surrogate willing to receive during pregnancy: flu, Tdap, RSV, COVID-19? Are the intended parents asking for any, or asking her not to?',
      'What about her household: are her children vaccinated? Does anyone in the home work in healthcare or childcare?',
      'If she gets sick, who decides on treatment?',
    ],
  },
  { kind: 'h3', text: 'Bed rest and complications' },
  {
    kind: 'bullets',
    items: [
      "If a doctor orders modified or full bed rest, who cares for her children? Who covers housekeeping, lost wages, and her partner's lost wages?",
      'Is she willing to be hospitalized for an extended stay if needed?',
      'Is she willing to take progesterone shots, estrogen, and other fertility medicines for weeks? Has she done injections before?',
    ],
  },
  { kind: 'h3', text: 'Intimacy and home life' },
  {
    kind: 'bullets',
    items: [
      'Most contracts restrict sexual intercourse around transfer and sometimes later. Is everyone comfortable discussing that?',
      "Does the surrogate's partner fully support this? What do they expect from the intended parents?",
      'Who else lives in the home? Pets, especially cats (toxoplasmosis), and who handles the litter box?',
      'Is the surrogate planning any big changes during the pregnancy: moving, a new job, divorce, a new baby of her own after?',
    ],
  },

  { kind: 'h2', text: 'Communication and the relationship' },
  {
    kind: 'p',
    text: 'Most post-match conflict is not about medicine or money. It is about one side wanting more contact than the other. Get specific.',
  },
  { kind: 'h3', text: 'How often, and how' },
  {
    kind: 'bullets',
    items: [
      'How often do you want to hear from each other: daily texts, a weekly call, only after appointments?',
      'Text, phone, video, email, or a shared app? Who starts the conversation?',
      'What hours are off limits? What counts as urgent enough for a late-night call?',
      'Is it all right if one side goes quiet for a few days? How will you say "I need space" without it feeling like rejection?',
    ],
  },
  { kind: 'h3', text: 'Appointments' },
  {
    kind: 'bullets',
    items: [
      'Do the intended parents want to attend every appointment, the big ones only, or join by video?',
      'Will the surrogate share ultrasound photos, test results, and portal access? Right away or after she has processed them?',
      "Can the intended parents contact the surrogate's OB directly, or does everything go through her?",
    ],
  },
  { kind: 'h3', text: 'Privacy and social media' },
  {
    kind: 'bullets',
    items: [
      'Will the surrogate post about the pregnancy on social media? Can she mention the intended parents, show a bump, announce the birth?',
      'Will the intended parents post about her? Photos of her? Her name?',
      'Who in each family knows? What does the surrogate tell her own children, her employer, her neighbors?',
      'Is anyone writing a blog, a book, or talking to media? Is anyone being filmed?',
    ],
  },
  { kind: 'h3', text: 'Families and in-person time' },
  {
    kind: 'bullets',
    items: [
      'Will you meet in person before transfer? How often during the pregnancy?',
      "Do the surrogate's children and the intended parents' other children meet?",
      "Will the surrogate's partner and the intended parents have their own relationship?",
      'Holidays, birthdays, gifts: any expectations either way?',
    ],
  },
  { kind: 'h3', text: 'After the birth' },
  {
    kind: 'bullets',
    items: [
      'What relationship do you want after delivery: lifelong friends, yearly updates, a clean goodbye? Be honest, and be ready for the other side to want something different.',
      'Will the surrogate receive photos and updates of the child? For how long?',
      'Will the child know who carried them? Will the surrogate be part of that story?',
      'Would either of you consider a sibling journey together?',
    ],
  },
  { kind: 'h3', text: 'Values and worldview' },
  {
    kind: 'bullets',
    items: [
      'Does religion or politics matter to either of you in this relationship? Would a difference bother you over nine months of close contact?',
      'Same-sex couples, single parents, and international parents: is the surrogate fully comfortable, and is her family?',
      'What does each side most fear about this process? What would make you feel let down?',
    ],
  },

  { kind: 'h2', text: 'Money, insurance, and logistics' },
  {
    kind: 'p',
    text: 'You do not negotiate the contract on the first call. You do find out whether you are in the same ballpark, and whether anyone has expectations the other side has never heard of. Independent matches have no agency to set the numbers, so this conversation matters more here than anywhere else. Final figures belong in the contract your attorneys draft.',
  },
  { kind: 'h3', text: 'Compensation' },
  {
    kind: 'bullets',
    items: [
      'What base compensation does the surrogate expect? What have the intended parents budgeted? Is this her first journey or is she an experienced surrogate, which usually changes the number?',
      'Is compensation paid monthly after a heartbeat is confirmed, or on another schedule?',
      'Will the money go through an escrow account or trust managed by a third party? Most attorneys insist on this. Intended parents should never pay the surrogate directly, and a surrogate should never be asked to wait on a check.',
      'What monthly allowance for incidentals (phone, mileage, vitamins, parking)?',
    ],
  },
  { kind: 'h3', text: 'Additional fees people forget' },
  {
    kind: 'bullets',
    items: [
      'Transfer fee, mock cycle fee, and a fee for a canceled cycle.',
      'Maternity clothing allowance.',
      'C-section fee, multiples fee, and a fee for invasive procedures such as amniocentesis.',
      'Fee for loss of reproductive organs (hysterectomy) or other permanent injury.',
      "Lost wages: gross or net? For how many weeks after delivery? Does it cover her partner's lost wages for transfer, delivery, and bed rest?",
      'Childcare and housekeeping if she is on bed rest or recovering.',
      'Pumping breast milk after birth: is it wanted, and what is paid per week, plus supplies and shipping?',
      'Counseling or therapy for the surrogate during and after the journey.',
      'Life insurance for the surrogate and, where offered, disability coverage.',
    ],
  },
  { kind: 'h3', text: 'Health insurance' },
  {
    kind: 'bullets',
    items: [
      'Does the surrogate have health insurance? Has anyone read the policy for a surrogacy exclusion? Many employer plans exclude surrogate pregnancies.',
      'If her plan excludes it or has a lien clause, the intended parents usually buy a separate policy. Who pays the premiums, deductible, and out-of-pocket maximum?',
      "Will the intended parents cover the baby's medical costs from birth, including a NICU stay?",
      "Does the surrogate's plan renew mid-pregnancy, and could it change?",
    ],
  },
  { kind: 'h3', text: 'Travel and time' },
  {
    kind: 'bullets',
    items: [
      'How many trips to the clinic are expected for screening, mock cycle, and transfer? Who pays for flights, hotels, meals, and a companion?',
      'If the intended parents live far away, who travels for appointments and the birth?',
      'How much time off work will the surrogate need, and does her job allow it?',
    ],
  },
  { kind: 'h3', text: 'Who pays for whom' },
  {
    kind: 'bullets',
    items: [
      "Intended parents pay for both attorneys, the surrogate's psychological screening, medical screening, and the escrow service. Does everyone agree?",
      'Who pays if the match ends before transfer? What costs are already sunk?',
      'Does the surrogate expect anything beyond the contract, such as gifts or a post-birth trip? Do the intended parents expect anything beyond the contract?',
    ],
  },

  { kind: 'h2', text: 'Delivery, the hospital, and after' },
  {
    kind: 'p',
    text: 'The birth is the moment everyone has been working toward and the moment most likely to produce hurt feelings. Decide the details long before the due date.',
  },
  { kind: 'h3', text: 'The birth plan' },
  {
    kind: 'bullets',
    items: [
      'Where will the surrogate deliver? Does that hospital have experience with surrogacy and a plan for two patients, mother and baby, with different families?',
      "Vaginal birth or scheduled C-section if medically needed? Is she open to induction if the doctors or the intended parents' schedule call for it?",
      'Epidural and pain management: her choice, with no input from the intended parents. Does everyone agree?',
      'Doula, midwife, or birth photographer: does she want one, and who pays?',
    ],
  },
  { kind: 'h3', text: 'Who is in the room' },
  {
    kind: 'bullets',
    items: [
      'Who does the surrogate want present at delivery: her partner, both intended parents, one of them, nobody until after?',
      'If there is a C-section, hospitals often allow one support person. Who is it?',
      'If the intended parents cannot arrive in time, who is with the baby?',
    ],
  },
  { kind: 'h3', text: 'The first hours' },
  {
    kind: 'bullets',
    items: [
      'Who holds the baby first? Does the surrogate want to hold the baby at all, or prefer not to?',
      'Skin-to-skin: with the intended parents, or with the surrogate while the baby stabilizes?',
      'Delayed cord clamping, cord blood banking, and who cuts the cord.',
      'Photos and video: what is she comfortable with, and what will the intended parents share?',
      'Separate rooms, or a shared room? Will the intended parents stay in the hospital?',
      'If the baby goes to the NICU, how does the surrogate get updates, and who makes decisions?',
    ],
  },
  { kind: 'h3', text: 'Breast milk' },
  {
    kind: 'bullets',
    items: [
      'Do the intended parents want the surrogate to pump? For how long? Is she willing, and has she thought about what pumping without a baby feels like?',
      'If not pumping, will she take medication to stop lactation, and who pays?',
      'Donating colostrum in the first days only is a common middle ground.',
    ],
  },
  { kind: 'h3', text: 'Recovery and goodbye' },
  {
    kind: 'bullets',
    items: [
      'Who checks on the surrogate after discharge? Postpartum depression is real for surrogates too, and the intended parents are often focused on the baby.',
      'How many weeks of lost wages and help at home after delivery? More after a C-section?',
      'Is the surrogate expected at a follow-up visit, and will she be reimbursed?',
      'When and how will you say goodbye at the hospital? A planned moment is kinder than an awkward one.',
      'When does the last payment arrive?',
    ],
  },

  { kind: 'h2', text: 'Legal and practical' },
  {
    kind: 'p',
    text: 'None of this is legal advice. It is the list of things your attorneys will need to know, so you might as well learn the answers before you hire them.',
  },
  { kind: 'h3', text: 'Where you live' },
  {
    kind: 'bullets',
    items: [
      'What state does the surrogate live in, and where will she deliver? Surrogacy law is state by state, and a few states still restrict or do not recognize compensated surrogacy.',
      'Where do the intended parents live? If they are in another state or country, who handles the birth certificate, passports, and travel home?',
      'Is the surrogate married? In some states a spouse must sign the agreement and is presumed a legal parent until a court order says otherwise.',
    ],
  },
  { kind: 'h3', text: 'Attorneys and parentage' },
  {
    kind: 'bullets',
    items: [
      'Each side needs its own attorney, paid by the intended parents. Has anyone already spoken to one?',
      "Does the delivery state allow a pre-birth parentage order, or only post-birth? How long does it take, and will the intended parents' names be on the original birth certificate?",
      'For same-sex couples and parents using donor gametes, is a second-parent adoption also needed where they live?',
      'Who names the baby, and will the surrogate know the name?',
    ],
  },
  { kind: 'h3', text: 'Screening and timeline' },
  {
    kind: 'bullets',
    items: [
      "Has the surrogate had a psychological evaluation and medical screening before? Is she willing to do both again with the intended parents' clinic?",
      "Will the surrogate's partner also be screened, including infectious-disease testing?",
      'Is a background check acceptable to everyone? Criminal and financial?',
      "What is the realistic timeline: screening, contract, medications, transfer, confirmed pregnancy? Does anyone have a deadline, such as embryo storage limits or an intended parent's age or health?",
      'How many transfers, and over how many months, before either side can end the agreement?',
    ],
  },
  { kind: 'h3', text: 'Guardianship and the unthinkable' },
  {
    kind: 'bullets',
    items: [
      'Do the intended parents have a will naming a guardian for the child, including a child not yet born?',
      'Does the surrogate have a will and a guardian plan for her own children?',
      'What happens if the intended parents separate during the pregnancy? If one of them dies?',
    ],
  },
  { kind: 'h3', text: 'Ending the match' },
  {
    kind: 'bullets',
    items: [
      'What is the clean way to walk away if either side changes their mind before transfer? Agree now that no one owes an explanation beyond "this is not the right fit."',
      'Once a pregnancy exists, nobody can walk away. Does everyone understand that?',
      'Will you keep a written record, through the platform or a shared document, of what you agreed on?',
    ],
  },

  { kind: 'h2', text: 'Red flags, and what comes next' },
  { kind: 'h3', text: 'Red flags on a first call' },
  {
    kind: 'bullets',
    items: [
      'Anyone who asks for money before a contract is signed, for any reason: travel, a deposit, medical bills, a "good faith" payment.',
      'Anyone who refuses video, or will not show ID.',
      'A surrogate who has not had a child of her own, or who cannot name her OB or the hospital where she delivered.',
      'Intended parents who will not say which clinic holds their embryos, or who have no embryos yet and no plan.',
      'Anyone who brushes off the hard questions with "we will figure it out" or "that will never happen."',
      'Pressure to decide on the first call, or to skip attorneys, psychological screening, or escrow to save money.',
      'Stories that change between the profile, the messages, and the call.',
      'A partner who is absent, dismissive, or clearly not on board.',
    ],
  },
  { kind: 'h3', text: 'If the call went well' },
  {
    kind: 'numbered',
    items: [
      'Sleep on it. Do not commit on the call.',
      'Schedule a second video call within a week to finish the list and include anyone who missed the first.',
      'Exchange a short written summary of what you agreed on, especially the hard-question answers, and confirm the other side read it the same way.',
      'Intended parents confirm their clinic will screen this surrogate. Surrogates confirm the clinic exists and that the intended parents are patients there.',
      "Each side hires their own surrogacy attorney in the surrogate's state. Intended parents pay for both.",
      'Set up escrow before any money changes hands. Never send money directly to each other.',
      'Keep messaging through Independent Journey until contracts are signed, so there is a record if anything goes wrong.',
    ],
  },
  { kind: 'h3', text: 'If it did not go well' },
  {
    kind: 'p',
    text: 'Say so kindly and quickly. "Thank you for your honesty. I do not think we are the right fit, and I wish you a good journey" is enough. A clear no is a gift to both of you.',
  },
  {
    kind: 'note',
    text: 'This article is general information for people considering an independent surrogacy match. It is not medical, legal, or financial advice. Surrogacy law varies by state and changes. Talk to a licensed attorney and your clinic before you agree to anything.',
  },
];
