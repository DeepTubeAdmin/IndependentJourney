/**
 * The onboarding questionnaire for both roles.
 *
 * Each step lists its fields. A field names the database table and column
 * it saves to, so the onboarding screen can render any step from this file
 * without custom code per question. Required fields are the ones matching
 * needs; everything else is optional, and sensitive questions offer
 * "prefer not to say" or "discuss later".
 *
 * Wording in this file is shown to members. Flagged for attorney review.
 */
import type { Role } from '@/lib/auth';

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'state' | 'single' | 'multi' | 'yesno';

export type Option = { value: string; label: string };

export type Field = {
  key: string;
  /** 'ip_parents' keys are parent1_first_name, parent1_age, parent2_first_name, parent2_age (one row per parent). */
  table: 'profiles' | 'profile_private' | 'surrogate_details' | 'health_self_reports' | 'ip_details' | 'ip_parents' | 'agencies';
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Option[];
  /** For 'yesno': store true/false (boolean) instead of yes/no text. */
  boolean?: boolean;
  maxLength?: number;
  /** For 'date': which years the drop-down offers. 'past' = birthdays, 'future' = start dates. */
  years?: 'past' | 'future';
  /** When set, this field is also saved into profiles.headline_tags for preview cards. */
  headlineTag?: (value: unknown) => string | null;
};

export type Step = {
  id: string;
  title: string;
  intro?: string;
  /** Shown above health questions. */
  notice?: string;
  fields: Field[];
};

const YES_NO_DISCUSS: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'discuss_later', label: 'Discuss later' },
];

const CYCLE: Option[] = [
  { value: 'medicated', label: 'Medicated' },
  { value: 'natural', label: 'Natural' },
  { value: 'either', label: 'Open to either' },
];

const COMFORT: Option[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'not_comfortable', label: 'Not comfortable' },
  { value: 'to_discuss', label: 'To discuss' },
];

const RELATIONSHIP_LEVEL: Option[] = [
  { value: 'minimal', label: 'Minimal contact' },
  { value: 'regular_updates', label: 'Regular updates' },
  { value: 'close', label: 'Close relationship' },
];

export const PREFER_NOT = { value: 'prefer_not_to_say', label: 'Prefer not to say' };

export const US_STATES: Option[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
].map(([value, label]) => ({ value, label }));

/**
 * Asked of every independent member (both roles) on the first step. Agency-
 * posted profiles skip these: they are labelled "Agency" automatically.
 */
const AGENCY_QUESTIONS: Field[] = [
  { key: 'profile_type', table: 'profiles', label: 'Are you working with a surrogacy agency?', type: 'single', required: true, options: [{ value: 'independent', label: 'No, I am independent' }, { value: 'with_agency', label: 'Yes, I work with an agency' }], help: 'Shown on your profile as "Independent" or "With an agency".' },
  { key: 'agency_name', table: 'profiles', label: 'Agency name (optional)', type: 'text', maxLength: 80, help: 'Only if you work with one.' },
  { key: 'journey_types', table: 'profiles', label: 'I am open to the following types of journeys', type: 'single', required: true, options: [{ value: 'independent_only', label: 'Independent only' }, { value: 'agency_only', label: 'Agency only' }, { value: 'both', label: 'Both' }], help: 'Agencies can post profiles for the clients they represent. If you choose Independent only, agency profiles are hidden from your browsing and agencies cannot write to you first.' },
];

/** Medical clearance, answered by an agency in place of the private health step. */
const CLEARANCE: Option[] = [
  { value: 'yes', label: 'Yes, cleared' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'no', label: 'Not yet' },
];
const CLEARANCE_STEP: Step = {
  id: 'clearance',
  title: 'Medical clearance',
  intro: 'Agencies do not enter health details here. Instead, tell intended parents where this surrogate is in her medical screening.',
  fields: [
    { key: 'ob_cleared', table: 'surrogate_details', label: 'Cleared for surrogacy by her OB?', type: 'single', required: true, options: CLEARANCE },
    { key: 'clinic_cleared', table: 'surrogate_details', label: 'Cleared by a fertility clinic?', type: 'single', required: true, options: CLEARANCE, headlineTag: (v) => (v === 'yes' ? 'Clinic cleared' : null) },
    { key: 'clearance_clinic', table: 'surrogate_details', label: 'Clinic name (optional)', type: 'text', maxLength: 120 },
  ],
};

export const SURROGATE_STEPS: Step[] = [
  {
    id: 'basics',
    title: 'About you',
    intro: 'Only your first name, last initial and state are shown to others. Everything else stays private.',
    fields: [
      { key: 'first_name', table: 'profile_private', label: 'First name', type: 'text', required: true },
      { key: 'last_name', table: 'profile_private', label: 'Last name', type: 'text', required: true, help: 'Never shown to other members.' },
      { key: 'display_name', table: 'profiles', label: 'Name to show on your profile', type: 'text', required: true, placeholder: 'Usually your first name' },
      { key: 'date_of_birth', table: 'profile_private', label: 'Date of birth', type: 'date', years: 'past', required: true, help: 'You must be 21 or older. Only your age is shown.' },
      { key: 'city', table: 'profile_private', label: 'City', type: 'text', required: true, help: 'Private. Only your state is shown.' },
      { key: 'zip', table: 'profile_private', label: 'ZIP code', type: 'text', required: true, maxLength: 5, help: 'Private. We place you approximately on the map (about your ZIP area), never your address.' },
      { key: 'state', table: 'profiles', label: 'State', type: 'state', required: true },
      { key: 'phone', table: 'profile_private', label: 'Mobile phone', type: 'text', required: true, help: 'Private. Used to verify your account.' },
      ...AGENCY_QUESTIONS,
      { key: 'willing_to_travel', table: 'surrogate_details', label: 'Willing to travel for appointments or delivery?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'us_resident', table: 'surrogate_details', label: 'US resident or citizen?', type: 'yesno', boolean: true, required: true },
    ],
  },
  {
    id: 'health',
    title: 'Health, in your own words',
    notice:
      'Simple yes/no answers only. We never ask for medical records, and your answers here are private. You can choose to share them with a specific intended parent later, inside a conversation. Medical eligibility is always decided by a clinic, never by this platform.',
    fields: [
      { key: 'prior_births', table: 'health_self_reports', label: 'Number of prior births', type: 'number', required: true, headlineTag: (v) => (v == null ? null : `${v} prior ${v === 1 ? 'birth' : 'births'}`) },
      { key: 'prior_pregnancies_uncomplicated', table: 'health_self_reports', label: 'Were your prior pregnancies uncomplicated?', type: 'single', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No, I’ll explain' }, { value: 'discuss_later', label: 'Discuss later' }] },
      { key: 'pregnancy_notes', table: 'health_self_reports', label: 'Anything you want to add (optional)', type: 'textarea', maxLength: 500 },
      { key: 'bmi_range', table: 'health_self_reports', label: 'BMI range', type: 'single', options: [{ value: 'under_30', label: 'Under 30' }, { value: '30_33', label: '30 to 33' }, { value: 'over_33', label: 'Over 33' }, { value: 'not_sure', label: 'Not sure' }, PREFER_NOT] },
      { key: 'lifestyle_attestation', table: 'health_self_reports', label: 'I am a non-smoker, do not use drugs, and do not drink heavily.', type: 'yesno', boolean: true, required: true },
      { key: 'vaccinated', table: 'health_self_reports', label: 'Up to date on routine vaccinations?', type: 'single', options: YES_NO_DISCUSS },
      { key: 'vaccines_in_pregnancy', table: 'health_self_reports', label: 'Open to recommended vaccines during pregnancy?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'c_sections', table: 'health_self_reports', label: 'How many c-sections have you had?', type: 'number', required: true, placeholder: '0' },
      { key: 'ob_clearance', table: 'health_self_reports', label: 'Current clearance from your OB for surrogacy?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'condition_affecting_pregnancy', table: 'health_self_reports', label: 'Any condition that could affect a pregnancy?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'condition_notes', table: 'health_self_reports', label: 'Details (optional)', type: 'textarea', maxLength: 500 },
    ],
  },
  {
    id: 'situation',
    title: 'Your situation',
    fields: [
      { key: 'relationship_status', table: 'surrogate_details', label: 'Relationship status', type: 'single', required: true, options: [{ value: 'single', label: 'Single' }, { value: 'partnered', label: 'In a relationship' }, { value: 'married', label: 'Married' }, PREFER_NOT] },
      { key: 'partner_supportive', table: 'surrogate_details', label: 'If you have a partner, are they supportive?', type: 'single', options: [...YES_NO_DISCUSS, { value: 'no', label: 'Not applicable' }].filter((o, i, a) => a.findIndex((x) => x.value === o.value) === i) },
      { key: 'has_health_insurance', table: 'surrogate_details', label: 'Do you have health insurance?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'insurance_covers_surrogacy', table: 'surrogate_details', label: 'Does it cover surrogacy (or exclude it)?', type: 'single', options: [{ value: 'yes', label: 'Covers it' }, { value: 'no', label: 'Excludes it' }, { value: 'discuss_later', label: 'Not sure yet' }] },
      { key: 'support_system', table: 'surrogate_details', label: 'Your support system (optional)', type: 'textarea', maxLength: 400, placeholder: 'Family, friends, childcare help…' },
      { key: 'reliable_transportation', table: 'surrogate_details', label: 'Reliable transportation to appointments?', type: 'yesno', boolean: true },
      { key: 'financially_stable', table: 'surrogate_details', label: 'Financially stable (not relying on compensation for basic needs)?', type: 'single', options: [...YES_NO_DISCUSS.slice(0, 2), PREFER_NOT] },
      { key: 'background_check', table: 'surrogate_details', label: 'Able to pass a background check?', type: 'single', required: true, options: YES_NO_DISCUSS },
    ],
  },
  {
    id: 'preferences',
    title: 'Your preferences',
    fields: [
      { key: 'journeys_completed', table: 'surrogate_details', label: 'How many surrogate journeys have you completed?', type: 'number', required: true, placeholder: '0', help: 'Enter 0 if this would be your first journey.', headlineTag: (v) => { const n = v === '' || v == null ? NaN : Number(v); return !Number.isFinite(n) ? null : n > 0 ? `${n} ${n === 1 ? 'journey' : 'journeys'} completed` : 'First-time surrogate'; } },
      { key: 'cycle_preference', table: 'surrogate_details', label: 'What type of cycle do you prefer?', type: 'single', required: true, options: CYCLE, help: 'A medicated cycle uses hormones to time the transfer; a natural cycle follows your own ovulation.' },
      { key: 'untested_embryos_ok', table: 'surrogate_details', label: 'Willing to use embryos that have not been genetically tested?', type: 'single', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }] },
      { key: 'compensation_open', table: 'surrogate_details', label: 'Compensation', type: 'single', required: true, options: [{ value: 'true', label: 'Open to discuss' }, { value: 'false', label: 'I have a range in mind' }], boolean: true },
      { key: 'compensation_min_usd', table: 'surrogate_details', label: 'Range from (optional)', type: 'money' },
      { key: 'compensation_max_usd', table: 'surrogate_details', label: 'Range to (optional)', type: 'money' },
      { key: 'open_to_twins', table: 'surrogate_details', label: 'Open to carrying twins?', type: 'single', required: true, options: COMFORT, headlineTag: (v) => (v === 'comfortable' ? 'Open to twins' : null) },
      { key: 'termination_comfort', table: 'surrogate_details', label: 'Comfort with termination for medical reasons', type: 'single', required: true, options: COMFORT },
      { key: 'reduction_comfort', table: 'surrogate_details', label: 'Comfort with selective reduction', type: 'single', options: COMFORT },
      { key: 'relationship_level', table: 'surrogate_details', label: 'Relationship with intended parents', type: 'single', required: true, options: RELATIONSHIP_LEVEL, headlineTag: (v) => RELATIONSHIP_LEVEL.find((o) => o.value === v)?.label ?? null },
      { key: 'open_to_ip_types', table: 'surrogate_details', label: 'Open to working with', type: 'multi', options: [{ value: 'couples', label: 'Couples' }, { value: 'single_parents', label: 'Single parents' }, { value: 'lgbtq_families', label: 'LGBTQ+ families' }, { value: 'international', label: 'Parents living abroad' }], help: 'Choose all that apply. Leave blank if you are open to everyone.' },
      { key: 'carry_donor_embryos', table: 'surrogate_details', label: 'Willing to carry embryos made with donor eggs or sperm?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'earliest_start', table: 'surrogate_details', label: 'Earliest you could start', type: 'date', years: 'future', required: true, headlineTag: (v) => (typeof v === 'string' && v ? `Ready ${new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : null) },
    ],
  },
];

export const IP_STEPS: Step[] = [
  {
    id: 'basics',
    title: 'About your family',
    intro: 'Only first names, ages, photos and your state are shown to others.',
    fields: [
      { key: 'display_name', table: 'profiles', label: 'How should we show your family?', type: 'text', required: true, placeholder: 'e.g. Daniel & Luis, or Priya' },
      { key: 'family_structure', table: 'ip_details', label: 'Family structure', type: 'single', required: true, options: [{ value: 'couple', label: 'Couple' }, { value: 'single', label: 'Single parent' }, PREFER_NOT] },
      { key: 'city', table: 'profile_private', label: 'City', type: 'text', required: true, help: 'Private. Only your state is shown.' },
      { key: 'zip', table: 'profile_private', label: 'ZIP code', type: 'text', required: true, maxLength: 5, help: 'Private. We place you approximately on the map (about your ZIP area), never your address.' },
      { key: 'state', table: 'profiles', label: 'State', type: 'state', required: true },
      { key: 'phone', table: 'profile_private', label: 'Mobile phone', type: 'text', required: true, help: 'Private. Used to verify your account.' },
      ...AGENCY_QUESTIONS,
    ],
  },
  {
    id: 'parents',
    title: 'The parents',
    intro: 'First names and ages appear on your full profile so surrogates know who they are talking with. Nothing else here is shown.',
    fields: [
      { key: 'parent1_first_name', table: 'ip_parents', label: 'Your first name', type: 'text', required: true },
      { key: 'parent1_age', table: 'ip_parents', label: 'Your age', type: 'number', required: true },
      { key: 'parent2_first_name', table: 'ip_parents', label: "Partner's first name", type: 'text', help: 'Leave blank if you are a single parent.' },
      { key: 'parent2_age', table: 'ip_parents', label: "Partner's age", type: 'number' },
    ],
  },
  {
    id: 'journey',
    title: 'Your journey so far',
    fields: [
      { key: 'reason_for_surrogacy', table: 'ip_details', label: 'Why surrogacy?', type: 'single', options: [{ value: 'medical', label: 'Medical reasons' }, { value: 'same_sex_couple', label: 'Same-sex couple' }, { value: 'single_parent', label: 'Single parent by choice' }, { value: 'other', label: 'Other' }, PREFER_NOT] },
      { key: 'embryos_status', table: 'ip_details', label: 'Embryos', type: 'single', required: true, options: [{ value: 'created', label: 'Already created' }, { value: 'in_progress', label: 'In progress' }, { value: 'not_yet', label: 'Not yet' }], headlineTag: (v) => (v === 'created' ? 'Embryos ready' : v === 'in_progress' ? 'Embryos in progress' : null) },
      { key: 'embryos_tested', table: 'ip_details', label: 'Embryos are genetically tested?', type: 'single', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'discuss', label: 'Will discuss' }] },
      { key: 'embryo_transfer_ok', table: 'ip_details', label: 'Willing to transfer embryos to a different location?', type: 'single', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], help: 'For example, shipping embryos to a clinic nearer the surrogate.' },
      { key: 'genetic_material_source', table: 'ip_details', label: 'Source of genetic material (general)', type: 'single', options: [{ value: 'own', label: 'Our own' }, { value: 'donor_egg', label: 'Donor egg' }, { value: 'donor_sperm', label: 'Donor sperm' }, { value: 'donor_both', label: 'Donor egg and sperm' }, PREFER_NOT] },
      { key: 'clinic_name', table: 'ip_details', label: 'Fertility clinic', type: 'text', required: true, placeholder: 'Clinic name, or "still choosing"' },
      { key: 'embryo_count_range', table: 'ip_details', label: 'Number of embryos (optional)', type: 'single', options: [{ value: '1', label: '1' }, { value: '2_3', label: '2 to 3' }, { value: '4_plus', label: '4 or more' }, PREFER_NOT] },
      { key: 'children_hoped_for', table: 'ip_details', label: 'Children you hope for', type: 'single', required: true, options: [{ value: '1', label: 'One' }, { value: '2_plus', label: 'Two or more' }, { value: 'open', label: 'Open' }], headlineTag: (v) => (v === '1' ? 'First child' : null) },
      { key: 'open_to_twins', table: 'ip_details', label: 'Open to twins?', type: 'single', required: true, options: COMFORT, headlineTag: (v) => (v === 'comfortable' ? 'Open to twins' : null) },
      { key: 'desired_start', table: 'ip_details', label: 'When would you like to start?', type: 'date', years: 'future', required: true, headlineTag: (v) => (typeof v === 'string' && v ? `Hoping to start ${new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : null) },
    ],
  },
  {
    id: 'preferences',
    title: 'What you are looking for',
    fields: [
      { key: 'surrogate_location_pref', table: 'ip_details', label: 'Where should your surrogate live?', type: 'single', options: [{ value: 'any', label: 'Anywhere in the US' }, { value: 'same_state', label: 'Same state as us' }, { value: 'nearby', label: 'Within driving distance' }] },
      { key: 'relationship_level', table: 'ip_details', label: 'Relationship you hope for', type: 'single', required: true, options: RELATIONSHIP_LEVEL, headlineTag: (v) => RELATIONSHIP_LEVEL.find((o) => o.value === v)?.label ?? null },
      { key: 'termination_comfort', table: 'ip_details', label: 'Views on termination for medical reasons', type: 'single', required: true, options: COMFORT },
      { key: 'reduction_comfort', table: 'ip_details', label: 'Views on selective reduction', type: 'single', options: COMFORT },
      { key: 'other_preferences', table: 'ip_details', label: 'Anything else that matters to you (optional)', type: 'textarea', maxLength: 800, help: 'For example, pregnancy history, family situation or lifestyle. Shown on your profile so surrogates can see if you are a fit.' },
    ],
  },
  {
    id: 'readiness',
    title: 'Readiness',
    fields: [
      { key: 'consulted_attorney', table: 'ip_details', label: 'Have you consulted a reproductive attorney?', type: 'yesno', boolean: true, required: true, headlineTag: (v) => (v === true ? 'Attorney consulted' : null) },
      { key: 'budget_range', table: 'ip_details', label: 'Overall budget range', type: 'single', required: true, options: [{ value: 'under_100k', label: 'Under $100k' }, { value: '100_150k', label: '$100k to $150k' }, { value: '150_200k', label: '$150k to $200k' }, { value: 'over_200k', label: 'Over $200k' }, PREFER_NOT] },
      { key: 'aware_of_birth_state_law', table: 'ip_details', label: 'Are you aware of the legal requirements in the state where the baby would be born?', type: 'yesno', boolean: true, required: true, help: 'If not, our Resources section has a plain-language starting point. It is general information, not legal advice.' },
    ],
  },
];

/** Keys an agency does not answer for a client: the agency is the contact, and labels are automatic. */
const NOT_FOR_MANAGED = new Set(['phone', 'profile_type', 'agency_name', 'journey_types']);

/**
 * The steps for a role. `managed` = an agency-posted profile: no phone, no
 * agency questions, and the private health step is replaced by medical clearance.
 */
export function stepsFor(role: Role, managed = false): Step[] {
  const base = role === 'surrogate' ? SURROGATE_STEPS : IP_STEPS;
  if (!managed) return base;
  return base
    .map((s) => (s.id === 'health' ? CLEARANCE_STEP : { ...s, fields: s.fields.filter((f) => !NOT_FOR_MANAGED.has(f.key)) }))
    .filter((s) => s.fields.length > 0);
}

// -----------------------------------------------------------------------------
// Agency account details. Saved to the agencies table (one row per agency).
// Shown to members on every profile the agency posts, except contact details.
// -----------------------------------------------------------------------------
const YES_NO: Option[] = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const RANGE_FEE: Option[] = [
  { value: 'under_20k', label: 'Under $20,000' }, { value: '20_30k', label: '$20,000 to $30,000' }, { value: '30_40k', label: '$30,000 to $40,000' },
  { value: '40_50k', label: '$40,000 to $50,000' }, { value: 'over_50k', label: 'Over $50,000' }, { value: 'discuss', label: 'Prefer to discuss' },
];
const RANGE_COST: Option[] = [
  { value: 'under_100k', label: 'Under $100,000' }, { value: '100_150k', label: '$100,000 to $150,000' }, { value: '150_200k', label: '$150,000 to $200,000' },
  { value: 'over_200k', label: 'Over $200,000' }, { value: 'discuss', label: 'Prefer to discuss' },
];
const RANGE_COMP: Option[] = [
  { value: 'under_40k', label: 'Under $40,000' }, { value: '40_55k', label: '$40,000 to $55,000' }, { value: '55_70k', label: '$55,000 to $70,000' },
  { value: 'over_70k', label: 'Over $70,000' }, { value: 'discuss', label: 'Prefer to discuss' },
];
export const AGENCY_STEPS: Step[] = [
  {
    id: 'agency_basics',
    title: 'About your agency',
    intro: 'Your name, website, logo and location are shown on every profile you post. Contact details stay private.',
    fields: [
      { key: 'name', table: 'agencies', label: 'Agency name', type: 'text', required: true, maxLength: 80 },
      { key: 'website', table: 'agencies', label: 'Website', type: 'text', required: true, maxLength: 200, placeholder: 'https://', help: 'Required. Members can visit it from your clients’ profiles.' },
      { key: 'contact_name', table: 'agencies', label: 'Your name (main contact)', type: 'text', required: true, maxLength: 80, help: 'Private. Messages to your clients reach you.' },
      { key: 'contact_phone', table: 'agencies', label: 'Phone (optional)', type: 'text', maxLength: 30, help: 'Private. Only used if we need to reach you.' },
      { key: 'year_founded', table: 'agencies', label: 'Year founded', type: 'number', placeholder: '2015' },
      { key: 'hq_state', table: 'agencies', label: 'Home office state', type: 'state', required: true },
      { key: 'states_served', table: 'agencies', label: 'States you work in', type: 'multi', required: true, options: [{ value: 'ALL', label: 'All surrogacy-friendly states' }, ...US_STATES], help: 'Choose all that apply.' },
    ],
  },
  {
    id: 'agency_services',
    title: 'Services and experience',
    intro: 'Plain answers help members compare. Ranges are fine.',
    fields: [
      { key: 'services', table: 'agencies', label: 'What you provide', type: 'multi', required: true, options: [
        { value: 'matching', label: 'Matching' }, { value: 'screening', label: 'Surrogate screening' }, { value: 'case_management', label: 'Journey coordination / case management' },
        { value: 'escrow', label: 'Escrow management' }, { value: 'legal', label: 'In-house or partner legal' }, { value: 'insurance', label: 'Insurance review and placement' },
        { value: 'counseling', label: 'Mental health support' }, { value: 'egg_donation', label: 'Egg donation program' }, { value: 'international', label: 'Support for international parents' },
      ], help: 'Choose all that apply.' },
      { key: 'journeys_range', table: 'agencies', label: 'Journeys completed', type: 'single', options: [{ value: 'under_10', label: 'Under 10' }, { value: '10_50', label: '10 to 50' }, { value: '50_200', label: '50 to 200' }, { value: 'over_200', label: 'Over 200' }] },
      { key: 'match_wait', table: 'agencies', label: 'Typical wait for a match', type: 'single', options: [{ value: 'under_3', label: 'Under 3 months' }, { value: '3_6', label: '3 to 6 months' }, { value: '6_12', label: '6 to 12 months' }, { value: 'over_12', label: 'Over 12 months' }] },
      { key: 'surrogate_screening', table: 'agencies', label: 'Surrogate screening you perform', type: 'multi', options: [
        { value: 'background', label: 'Criminal background check' }, { value: 'psych', label: 'Psychological evaluation' }, { value: 'medical_records', label: 'Medical records review' },
        { value: 'insurance_review', label: 'Insurance review' }, { value: 'financial', label: 'Financial review' }, { value: 'home_visit', label: 'Home visit' },
      ], help: 'Choose all that apply.' },
      { key: 'escrow', table: 'agencies', label: 'How client funds are held', type: 'single', options: [{ value: 'third_party', label: 'Licensed third-party escrow or attorney trust account' }, { value: 'agency', label: 'Agency-managed escrow' }, { value: 'discuss', label: 'Varies / prefer to discuss' }] },
      { key: 'memberships', table: 'agencies', label: 'Memberships', type: 'multi', options: [{ value: 'seeds', label: 'SEEDS' }, { value: 'asrm', label: 'ASRM' }, { value: 'resolve', label: 'RESOLVE' }, { value: 'mhb', label: 'Men Having Babies' }], help: 'Optional. Choose all that apply.' },
    ],
  },
  {
    id: 'agency_fees',
    title: 'Fees and who you work with',
    intro: 'Members see these ranges on your clients’ profiles. Nothing here is a contract.',
    fields: [
      { key: 'ip_fee_range', table: 'agencies', label: 'Typical agency fee for intended parents', type: 'single', required: true, options: RANGE_FEE, help: 'Your fee only, not the whole journey.' },
      { key: 'journey_cost_range', table: 'agencies', label: 'Typical all-in journey cost', type: 'single', options: RANGE_COST, help: 'Agency fee, surrogate compensation, legal, insurance and clinic, as a rough total.' },
      { key: 'surrogate_comp_range', table: 'agencies', label: 'Typical surrogate base compensation', type: 'single', required: true, options: RANGE_COMP },
      { key: 'international', table: 'agencies', label: 'Do you work with intended parents living outside the US?', type: 'single', options: YES_NO },
      { key: 'lgbtq', table: 'agencies', label: 'Do you work with LGBTQ+ intended parents?', type: 'single', options: YES_NO },
      { key: 'works_with_site_matches', table: 'agencies', label: 'Will you support a surrogate and intended parents who met on this site but are not your clients?', type: 'single', options: [...YES_NO, { value: 'discuss', label: 'Case by case' }], help: 'Many independent matches look for an agency to manage the journey.' },
    ],
  },
  {
    id: 'agency_story',
    title: 'Your agency in your words',
    fields: [
      { key: 'description', table: 'agencies', label: 'About your agency', type: 'textarea', required: true, maxLength: 1500, placeholder: 'Who you are, how you support surrogates and intended parents, and what makes you different.' },
      { key: 'attested_consent', table: 'agencies', label: 'I am authorized to act for this agency, and I will only post profiles for clients who have given us written consent to be listed here.', type: 'yesno', boolean: true, required: true },
    ],
  },
];

/** Non-questionnaire steps that every role goes through after the questions. */
export const FINAL_STEPS = ['photos', 'bio', 'review'] as const;
