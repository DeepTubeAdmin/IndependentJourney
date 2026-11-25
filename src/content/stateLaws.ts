/**
 * Surrogacy law in brief for each state and DC, for the state pages
 * (/surrogacy/<state>).
 *
 * HOW THIS WAS RESEARCHED (November 2026)
 * Every state was checked against two independent published overviews:
 *   1. Surrogacy360, United States state law summaries, updated March 30, 2026.
 *   2. The American Society for Reproductive Medicine (ASRM) Legal Professional
 *      Group, "Surrogacy Laws By State". Each state section there carries its
 *      own "updated" date, recorded below as asrmUpdated.
 * Each bullet says what that source reports. Nothing here is our own reading
 * of a statute. Where the two sources disagree, or one is older than a recent
 * change in the law, the entry has a `note` saying so, and the page shows it.
 *
 * This is general information, not legal advice. The pages say so at the top
 * and bottom and tell readers to speak to an attorney licensed in the state.
 *
 * TO UPDATE: re-read both sources for the state, change the bullets, and
 * change STATE_LAWS_REVIEWED.
 */

export const STATE_LAWS_REVIEWED = 'November 2026';

export type LawStatus = 'statute' | 'limits' | 'courts' | 'unaddressed' | 'restricted';

/** Plain-language headline for each status. These are our summary labels, not legal terms. */
export const STATUS_LABEL: Record<LawStatus, string> = {
  statute: 'Gestational surrogacy is permitted by state statute',
  limits: 'Permitted by statute, with limits on who can use it',
  courts: 'No dedicated statute; recognised through court decisions',
  unaddressed: 'No surrogacy statute; outcomes depend on the court and county',
  restricted: 'Restricted: agreements are void, unenforceable or narrowly limited',
};

export type StateLaw = {
  /** Two-letter code, as stored on profiles. */
  code: string;
  name: string;
  /** Page address: /surrogacy/<slug>. */
  slug: string;
  status: LawStatus;
  /** What Surrogacy360 (March 2026) reports. */
  s360: string[];
  /** What the ASRM legal group overview reports. */
  asrm: string[];
  /** The "updated" date ASRM shows for this state. "Update pending" means ASRM has not verified it since before 2024. */
  asrmUpdated: string;
  /** Shown prominently when the sources disagree or one predates a law change. */
  note?: string;
};

export const SOURCE_S360 = {
  label: 'Surrogacy360, United States surrogacy law map and state summaries (updated March 30, 2026)',
  url: 'https://surrogacy360.org/wp-content/uploads/2026/03/2026-S3-US-Map-Update_3.30.26.pdf',
};
export const SOURCE_ASRM = {
  label: 'American Society for Reproductive Medicine, Legal Professional Group, “Surrogacy Laws By State”',
  url: 'https://connect.asrm.org/lpg/resources/surrogacy-by-state',
};
export const SOURCE_AAAA = {
  label: 'Academy of Adoption & Assisted Reproduction Attorneys, attorney directory',
  url: 'https://adoptionart.org/',
};

const PENDING = 'Update pending';

function st(code: string, name: string, status: LawStatus, asrmUpdated: string, s360: string[], asrm: string[], note?: string): StateLaw {
  return { code, name, slug: name.toLowerCase().replace(/ /g, '-'), status, s360, asrm, asrmUpdated, note };
}

export const STATE_LAWS: StateLaw[] = [
  st('AL', 'Alabama', 'unaddressed', 'April 2024',
    ['State law does not address whether surrogacy agreements can be enforced.', 'Entering an agreement, or paying a surrogate more than her expenses, is not a crime.', 'An adoption after the birth is usually required.'],
    ['Describes surrogacy as permitted in Alabama.', 'Pre-birth parentage orders are usually granted to single or married intended parents. Unmarried couples get an order for one parent only.'],
    'The two sources describe Alabama differently: one says the law does not address enforceability and adoption is usually needed, the other says pre-birth orders are usually granted. Ask an Alabama attorney how your county handles it.'),
  st('AK', 'Alaska', 'unaddressed', PENDING,
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required.'],
    ['No statute or published court decision permits or prohibits surrogacy; it is described as an accepted practice.', 'Pre-birth orders have been granted to married couples who are both genetically related to the child. Other intended parents may need an adoption after the birth.']),
  st('AZ', 'Arizona', 'restricted', 'April 2024',
    ['An Arizona statute treats the surrogate as the legal mother. After a 1994 court decision, gestational agreements are enforceable only in limited cases, mainly where the intended mother is the genetic mother.', 'A single genetic father cannot enforce an agreement, and most male same-sex couples are excluded.'],
    ['The statute prohibits surrogacy contracts and makes them unenforceable, but courts still routinely grant pre-birth orders in qualifying cases.', 'Orders are routinely granted when both intended parents are genetically related, and when a married couple has at least one genetic parent. If neither is genetically related, an adoption after delivery is needed.']),
  st('AR', 'Arkansas', 'limits', 'July 2024',
    ['Agreements are enforceable for married intended parents where the intended father is the genetic father. A single woman may use an anonymous donor.', 'The statute does not address compensation.'],
    ['Arkansas statute expressly permits gestational surrogacy.', 'Pre-birth orders are generally granted to married couples or single intended parents where at least one is a genetic parent. For unmarried couples, only the genetic parent receives the order.']),
  st('CA', 'California', 'statute', 'July 2024',
    ['Gestational agreements are enforceable under the Family Code.', 'A surrogate may be compensated beyond her expenses.', 'Married, unmarried and single intended parents may all enter agreements.'],
    ['California expressly permits surrogacy arrangements.', 'Pre-birth and post-birth parentage orders are both available, regardless of marital status, sexual orientation or genetic connection.']),
  st('CO', 'Colorado', 'statute', 'July 2024',
    ['Gestational agreements are enforceable under a 2021 law, and compensation is allowed.', 'One party must be a Colorado resident unless the birth or the medical procedures take place in the state.'],
    ['Gestational surrogacy is expressly permitted by statute.', 'When the statute is followed, pre-birth orders are available to single people and couples, married or not, with or without a genetic connection.']),
  st('CT', 'Connecticut', 'statute', 'April 2024',
    ['Gestational agreements are enforceable under a 2022 law, and compensation is allowed.', 'At least one party must be a Connecticut resident.'],
    ['The Connecticut Parentage Act (2022) permits gestational surrogacy.', 'A pre-birth or post-birth judgment of parentage is available through the Probate Court to single people and couples, married or not, with or without a genetic connection.']),
  st('DE', 'Delaware', 'statute', PENDING,
    ['Gestational agreements are enforceable under a 2013 law, and compensation is allowed.'],
    ['Gestational surrogacy is expressly permitted by statute.', 'Pre-birth orders are commonly granted to any intended parent, single or a couple, married or not, genetically related or not.']),
  st('DC', 'District of Columbia', 'statute', 'September 2024',
    ['Gestational agreements are enforceable, and compensation is allowed.', 'Married, unmarried and single intended parents may enter agreements.', 'One party must have lived in DC for a year, unless the child is born in DC.'],
    ['A 2016 statute permits surrogacy.', 'To use it, one party must live in DC or the birth must take place there.']),
  st('FL', 'Florida', 'limits', 'April 2024',
    ['A gestational surrogacy agreement is enforceable only if at least one intended parent is a genetic parent. Other arrangements go through a separate “preplanned adoption agreement” law.', 'Single intended parents cannot use the gestational surrogacy statute.'],
    ['Surrogacy contracts are enforceable in Florida.', 'One statute covers married couples using genetic material from at least one of them. A second covers single people, unmarried couples and those with no genetic link.', 'The parentage petition is filed after the birth, within a short deadline.']),
  st('GA', 'Georgia', 'unaddressed', 'April 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required.'],
    ['No statute or published court decision permits or prohibits surrogacy, and courts typically uphold agreements.', 'Pre-birth orders are usually granted, including to single intended parents and where neither intended parent is genetically related.']),
  st('HI', 'Hawaii', 'statute', 'February 2026',
    ['Gestational agreements are enforceable under a new parentage law, and compensation is allowed.', 'Intended parents do not have to be married.'],
    ['Hawaii’s Uniform Parentage Act took effect on January 1, 2026 and expressly permits gestational surrogacy.', 'Pre-birth and post-birth orders are available to couples and single people regardless of genetic connection, provided the agreement meets the statute.'],
    'Hawaii’s law is new. Anything written before 2026 about Hawaii is likely to be out of date.'),
  st('ID', 'Idaho', 'statute', 'March 2024',
    ['Gestational agreements that a court has validated are enforceable under a 2023 law, and compensation beyond costs is allowed.', 'There is a six-month residency or “sufficient contacts” requirement.', 'A person receiving public assistance may not serve as a surrogate.'],
    ['Gestational surrogacy is expressly permitted by statute.', 'The agreement is validated by a court before the birth or within seven days after it.', 'One or two intended parents may use it; marriage and a genetic connection are not required.']),
  st('IL', 'Illinois', 'statute', 'February 2026',
    ['Gestational agreements are enforceable, and compensation is allowed.', 'Single and unmarried intended parents may enter agreements.'],
    ['A 2025 law (the Equality for Every Family Act) updated Illinois’ long-standing surrogacy statute and removed the requirement of a genetic link.', 'Intended parents who meet the statute are named on the birth certificate without a court case.', 'Both sides must be represented by Illinois attorneys.']),
  st('IN', 'Indiana', 'restricted', 'May 2024',
    ['A 1997 statute says surrogacy contracts are void and cannot be enforced in court.', 'Court decisions have sometimes recognised intended parents anyway.'],
    ['The statute makes certain surrogacy contract terms void and unenforceable, and it is unclear whether that affects the whole agreement.', 'Arrangements still take place, and pre-birth orders are often granted.']),
  st('IA', 'Iowa', 'courts', 'March 2024',
    ['Following a 2018 Iowa Supreme Court decision, gestational agreements are enforceable where both intended parents are genetic parents.', 'Paying a surrogate is not a crime.'],
    ['The 2018 decision upheld a gestational surrogacy agreement.', 'Parentage is completed in stages: an order before birth for a genetically related intended father, an order after birth for a genetically related intended mother, and an adoption for a parent who is not genetically related.']),
  st('KS', 'Kansas', 'unaddressed', 'April 2024',
    ['State law does not address gestational surrogacy agreements. Older attorney general opinions concern traditional surrogacy only.'],
    ['No statute or court decision prevents surrogacy.', 'Pre-birth orders are granted in most counties when at least one parent is genetically related.', 'Contract terms about ending a pregnancy may not be enforceable.']),
  st('KY', 'Kentucky', 'unaddressed', 'June 2024',
    ['State law does not address gestational surrogacy. A Kentucky statute prohibits compensated traditional surrogacy, where the surrogate’s own egg is used.'],
    ['Pre-birth orders are usually granted to married intended parents with a genetic link and to genetically related single parents.', 'Unmarried couples and parents with no genetic link are typically required to adopt.']),
  st('LA', 'Louisiana', 'restricted', 'June 2024',
    ['Only uncompensated gestational agreements are enforceable, and only for married intended parents who are both genetic parents, with court approval in advance. All other agreements are prohibited and void.', 'A surrogate may not be paid beyond her expenses.', 'The intended parents and the surrogate must have lived in Louisiana for 180 days.'],
    ['Gestational surrogacy is legal only for Louisiana residents who are a married heterosexual couple and both genetically related to the child.', 'The statute sets detailed contract requirements, with civil and criminal penalties for not following them.']),
  st('ME', 'Maine', 'statute', 'April 2024',
    ['Gestational agreements are enforceable under a 2016 law, and compensation is allowed.', 'The surrogate must be at least 21 and have given birth before.'],
    ['The Maine Parentage Act sets clear requirements for gestational surrogacy.', 'A pre-birth order can readily be obtained regardless of marital status, sexual orientation or genetic connection. A brief hearing is always held.']),
  st('MD', 'Maryland', 'courts', 'June 2024',
    ['No statute addresses surrogacy agreements. A Maryland high court decision allowed a gestational surrogate to be found not to be the parent.', 'This source reports that the same court indicated paying a surrogate is a crime.'],
    ['Court decisions implicitly permit gestational surrogacy, and a gestational surrogate may be compensated and have her expenses paid.', 'Pre-birth orders are available to any intended parent, married or not.', 'Either an intended parent or the surrogate must live in Maryland.'],
    'The two sources disagree on whether a surrogate can lawfully be paid in Maryland. Get a clear answer from a Maryland attorney before agreeing any compensation.'),
  st('MA', 'Massachusetts', 'statute', 'February 2026',
    ['Gestational agreements are enforceable under a 2025 law, and compensation is allowed.', 'The surrogate must be at least 21 and have given birth before.'],
    ['The Massachusetts Parentage Act took effect on January 1, 2025 and makes gestational agreements enforceable by statute.', 'It applies regardless of gender or marriage, and no genetic connection is required. A judgment of parentage is issued without a hearing.']),
  st('MI', 'Michigan', 'statute', 'February 2026',
    ['Gestational agreements are enforceable, and compensation is allowed.', 'Michigan residency is not needed if the birth or the assisted reproduction takes place in Michigan.'],
    ['Michigan’s Assisted Reproduction and Surrogacy Parentage Act took effect on April 1, 2025. Surrogacy agreements are no longer criminal.', 'It applies regardless of gender or marriage, and no genetic connection is required.', 'Both sides need Michigan-licensed attorneys and clearance from a Michigan-licensed mental-health provider.'],
    'Michigan’s law changed completely in 2025. Older articles describing Michigan as banning paid surrogacy are out of date.'),
  st('MN', 'Minnesota', 'unaddressed', 'April 2024',
    ['State law does not address surrogacy agreements, and unpublished court decisions have gone both ways.', 'An adoption after the birth may be required.'],
    ['No statute or published court decision permits or prohibits surrogacy.', 'Minnesota’s Parentage Act holds parentage proceedings until after the birth. A post-birth order is available to any intended parent, and results for pre-birth requests vary by county and judge.']),
  st('MS', 'Mississippi', 'unaddressed', 'March 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although some attorneys report obtaining court orders without one.'],
    ['No statute or published court decision permits or prohibits surrogacy.', 'Courts tend to grant pre-birth orders, including where neither intended parent is genetically related.']),
  st('MO', 'Missouri', 'unaddressed', 'March 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although some attorneys report obtaining court orders without one.'],
    ['No statute or court decision permits or prohibits surrogacy.', 'Missouri law does not allow parentage orders before the birth, but papers can be filed in advance so the order is signed soon after.', 'Orders are routine for single genetic parents and for married couples with at least one genetic parent. There is no clear route for an unmarried partner who is not genetically related.']),
  st('MT', 'Montana', 'unaddressed', 'April 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although some attorneys report obtaining court orders without one.'],
    ['No statute or published court decision permits or prohibits surrogacy, and courts are typically favourable to agreements.', 'Orders before or after the birth are usually granted when at least one intended parent is genetically related.']),
  st('NE', 'Nebraska', 'restricted', 'March 2024',
    ['A 1988 statute makes compensated surrogacy contracts void and unenforceable. It does not address unpaid arrangements.', 'An adoption after the birth is usually required.'],
    ['Surrogacy contracts are void and unenforceable, although not illegal.', 'Pre-birth orders are not available. An intended father or a genetic mother can be added to the birth certificate by a signed acknowledgment at the hospital; other intended parents must adopt.']),
  st('NV', 'Nevada', 'statute', 'March 2024',
    ['Gestational agreements are enforceable under a 2013 law, and compensation is allowed.', 'Married, unmarried and single intended parents may enter agreements.', 'No residency is needed if the birth, the contract or the assisted reproduction takes place in Nevada.'],
    ['Nevada statute expressly permits gestational surrogacy.', 'Pre-birth orders can readily be obtained by any intended parent, even where neither is genetically related.']),
  st('NH', 'New Hampshire', 'statute', 'April 2024',
    ['Gestational agreements are enforceable, and compensation is allowed.', 'Married, unmarried and single intended parents may enter agreements.', 'Non-residents may use the law if the child is born in New Hampshire.'],
    ['New Hampshire statute expressly permits gestational surrogacy.', 'Pre-birth orders can readily be obtained regardless of marital status, sexual orientation or genetic connection.']),
  st('NJ', 'New Jersey', 'statute', 'September 2024',
    ['Gestational agreements are enforceable under a 2018 law. Traditional surrogacy agreements are not.', 'The surrogate must be at least 21 and have given birth before, must have her own attorney, and both sides complete a psychological evaluation.', 'The statute requires the surrogate’s expenses to be paid and does not expressly say whether payment beyond expenses is allowed.'],
    ['The New Jersey Gestational Carrier Agreement Act (2018) expressly permits gestational surrogacy.', 'Pre-birth orders can readily be obtained by any intended parent, even where neither is genetically related.']),
  st('NM', 'New Mexico', 'unaddressed', 'April 2024',
    ['State law does not address whether surrogacy agreements can be enforced.', 'An adoption after the birth may be required.'],
    ['New Mexico statute neither permits nor prohibits gestational surrogacy.', 'Pre-birth orders can be obtained by nearly any intended parent, with some risk for single parents and where neither parent is genetically related.']),
  st('NY', 'New York', 'statute', 'July 2024',
    ['Gestational agreements are enforceable, and compensation is allowed. Traditional surrogacy agreements are not enforceable.', 'Intended parents must pay for the surrogate’s own attorney, health insurance and life insurance.', 'Compensation and expenses must be placed in escrow before any medical procedure.', 'The surrogate keeps the right to make all decisions about her health and the pregnancy.'],
    ['The Child-Parent Security Act took effect on February 15, 2021 and permits compensated gestational surrogacy.', 'Pre-birth orders are available for agreements that follow the statute.', 'The law includes a Surrogates’ Bill of Rights, requires New York attorneys for both sides, and requires surrogacy agencies to be licensed by the state health department.']),
  st('NC', 'North Carolina', 'unaddressed', 'March 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although some attorneys report obtaining court orders without one.'],
    ['No statute or published court decision permits or prohibits surrogacy.', 'A pre-birth order may be possible in certain counties and situations. Stepparent adoption is available; second-parent adoption is not.']),
  st('ND', 'North Dakota', 'limits', 'June 2024',
    ['Surrogacy contracts are void, with one exception: where two intended parents are both the genetic parents, they are the legal parents of a child born through gestational surrogacy.', 'Single parents and most same-sex couples would need an adoption.'],
    ['North Dakota statute expressly permits gestational surrogacy.', 'Pre-birth orders are readily obtained where at least one intended parent is genetically related; without a genetic link the outcome is unclear.'],
    'The two sources read North Dakota’s statute differently on how much of a genetic connection is required. Check with a North Dakota attorney.'),
  st('OH', 'Ohio', 'courts', 'April 2024',
    ['Gestational agreements are enforceable under Ohio court decisions from 2007 and 2010, and compensation is allowed.', 'Married, unmarried and single intended parents may enter agreements.'],
    ['A 2007 Ohio Supreme Court decision held that surrogacy does not violate public policy.', 'Pre-birth orders are granted in most circumstances, though practice depends on the county and judge.']),
  st('OK', 'Oklahoma', 'limits', 'May 2024',
    ['Gestational agreements are enforceable under a 2019 law, and compensation is allowed.', 'The surrogate must have lived in Oklahoma for 90 days before the agreement.', 'Two intended parents must be married to each other.'],
    ['The Oklahoma Gestational Agreement Act took effect in May 2019.', 'It is open to a single intended parent or a married couple, regardless of genetic connection.', 'A court must validate the agreement before any embryo transfer, and both sides need Oklahoma-licensed attorneys.']),
  st('OR', 'Oregon', 'statute', 'June 2024',
    ['Gestational agreements are regulated by a new statute and are enforceable, and compensation beyond costs is allowed.', 'Intended parents do not have to be married, and must pay for the surrogate’s own attorney.', 'The surrogate makes all decisions about her health and the pregnancy.'],
    ['Written before the new law: no statute, with surrogacy described as an accepted practice and pre-birth orders usually granted when one intended parent is genetically related.'],
    'Oregon enacted a surrogacy statute in 2026. The ASRM overview for Oregon was last updated in June 2024, before that law, so rely on a current Oregon attorney for the details.'),
  st('PA', 'Pennsylvania', 'unaddressed', 'April 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although court orders have been reported where both intended parents are genetic parents.'],
    ['No statute or published court decision permits or prohibits surrogacy.', 'Most counties grant pre-birth orders, with procedures that vary by county and judge.']),
  st('RI', 'Rhode Island', 'statute', 'April 2024',
    ['Gestational agreements are enforceable under a 2021 law, and compensation is allowed.', 'At least one intended parent must be a United States resident.', 'Intended parents must pay for the surrogate’s own attorney, and both sides have medical and mental-health consultations.'],
    ['The Rhode Island Uniform Parentage Act took effect on January 1, 2021 and expressly permits gestational surrogacy agreements that meet its requirements.', 'A genetic connection is not required.']),
  st('SC', 'South Carolina', 'unaddressed', 'April 2024',
    ['No statute addresses surrogacy agreements. A 2003 federal court decision suggests they are enforceable.', 'An adoption after the birth may be required.'],
    ['The 2003 decision suggests gestational surrogacy is permissible and enforceable.', 'Pre-birth and post-birth orders are both available to married or single intended parents, with procedures that differ by county.']),
  st('SD', 'South Dakota', 'unaddressed', 'March 2024',
    ['State law does not address surrogacy agreements.', 'An adoption after the birth may be required, although court orders have been reported where both intended parents are genetic parents.'],
    ['No statute or published court decision addresses surrogacy.', 'Pre-birth orders are available to intended parents whether married or not, even with no genetic link.', 'An agreement must not penalise the surrogate for refusing an abortion.']),
  st('TN', 'Tennessee', 'unaddressed', 'April 2024',
    ['Tennessee statute defines surrogacy but neither permits nor prohibits it. A 2014 Tennessee Supreme Court decision indicates agreements are likely enforceable.', 'Under that decision, payments are limited to the reasonable costs of the pregnancy, the birth and the surrogacy process.'],
    ['The statute neither permits nor prohibits surrogacy.', 'A pre-birth order requires at least one genetically related intended parent and names only that parent. A parent with no genetic link needs an adoption after the birth.']),
  st('TX', 'Texas', 'limits', 'April 2024',
    ['Gestational agreements are enforceable once a court has validated them.', 'Intended parents must be married to each other (same-sex spouses included), and medical evidence must show the intended mother cannot safely carry a pregnancy.', 'The surrogate or the intended parents must have lived in Texas for 90 days. The surrogate’s own eggs may not be used.', 'The statute does not address compensation beyond health-care costs.'],
    ['Texas statute permits gestational surrogacy arrangements and refers to married intended parents.', 'A pre-birth order follows only after a Texas court validates the agreement.', 'Some courts may grant orders to unmarried intended parents.']),
  st('UT', 'Utah', 'limits', 'June 2024',
    ['Gestational agreements are enforceable once a court has validated them.', 'Intended parents must be married to each other (same-sex spouses included), and at least one must be a genetic parent.', 'Compensation is allowed if reasonable. All parties must be at least 21 and attend counseling.', 'The surrogate or the intended parents must have lived in Utah for 90 days.'],
    ['Utah statute permits gestational surrogacy for married intended parents.', 'Pre-birth orders are available to married intended parents.'],
    'The sources differ on whether Utah requires a genetic connection. Confirm with a Utah attorney.'),
  st('VT', 'Vermont', 'statute', 'April 2024',
    ['Gestational agreements are enforceable, and compensation is allowed.', 'At least one party must be a Vermont resident.', 'Intended parents must pay for the surrogate’s own attorney and for health-care costs that insurance does not cover.'],
    ['The Vermont Parentage Act permits parentage through a gestational carrier agreement.', 'Orders before or after the birth are available to married or unmarried couples and single parents, with no genetic link required.']),
  st('VA', 'Virginia', 'limits', 'September 2024',
    ['Agreements are enforceable in some circumstances, either through court approval in advance or by the surrogate giving up her rights after the birth.', 'Payment beyond reimbursement of expenses is not permitted.', 'Two intended parents must be married (same-sex spouses included).'],
    ['Virginia statute permits surrogacy, and agreements that comply are enforceable.', 'Two intended parents must be married.', 'There are two routes: court approval before the IVF cycle, or an administrative route using a form filed after the birth, which is the one most people use.']),
  st('WA', 'Washington', 'statute', 'July 2024',
    ['Gestational agreements are enforceable under a 2019 law, and compensation is allowed.', 'One party must be a Washington resident, or a medical or mental-health consultation must take place in Washington.', 'Intended parents must pay for the surrogate’s own attorney.'],
    ['Washington statute permits compensated gestational surrogacy.', 'Pre-birth orders are available to any intended parent, regardless of marital status, genetic connection or sexual orientation, when the agreement follows the statute.']),
  st('WV', 'West Virginia', 'unaddressed', 'April 2024',
    ['State law does not address whether surrogacy agreements can be enforced. A statute confirms that paying a surrogate’s fees and expenses is not a crime.', 'An adoption after the birth may be required.'],
    ['Reads the same statute as permitting gestational surrogacy.', 'Pre-birth orders are issued in most instances, even without a genetic link, where the birth takes place in a West Virginia hospital. Practice varies by county and judge.']),
  st('WI', 'Wisconsin', 'courts', 'June 2024',
    ['Under a 2013 Wisconsin Supreme Court decision, agreements are enforceable if the court finds them to be in the child’s best interest, and compensation is allowed.'],
    ['The 2013 decision upholds surrogacy contracts that are not contrary to the child’s best interest.', 'Interim orders before the birth are usually obtainable, and a further order after the birth is needed for the birth certificate.']),
  st('WY', 'Wyoming', 'limits', PENDING,
    ['Under a 2021 law, agreements are enforceable as to the child’s parentage when they are written, notarised and filed with the state registrar.', 'Payments are limited to pregnancy-related expenses, including lost opportunity costs.', 'Two intended parents must be parties to the agreement.'],
    ['Describes Wyoming law as neither permitting nor prohibiting surrogacy, with too few cases to predict how a court would rule.'],
    'ASRM has not updated its Wyoming entry since before 2024, and it does not reflect the 2021 law described by the other source. Speak to a Wyoming attorney.'),
];

export function stateBySlug(slug: string): StateLaw | undefined {
  return STATE_LAWS.find((s) => s.slug === slug);
}
