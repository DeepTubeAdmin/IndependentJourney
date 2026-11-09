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

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'state' | 'single' | 'multi' | 'yesno';

export type Option = { value: string; label: string };

export type Field = {
  key: string;
  table: 'profiles' | 'profile_private' | 'surrogate_details' | 'health_self_reports' | 'ip_details';
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Option[];
  /** For 'yesno': store true/false (boolean) instead of yes/no text. */
  boolean?: boolean;
  maxLength?: number;
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

export const SURROGATE_STEPS: Step[] = [
  {
    id: 'basics',
    title: 'About you',
    intro: 'Only your first name, last initial and state are shown to others. Everything else stays private.',
    fields: [
      { key: 'first_name', table: 'profile_private', label: 'First name', type: 'text', required: true },
      { key: 'last_name', table: 'profile_private', label: 'Last name', type: 'text', required: true, help: 'Never shown to other members.' },
      { key: 'display_name', table: 'profiles', label: 'Name to show on your profile', type: 'text', required: true, placeholder: 'Usually your first name' },
      { key: 'date_of_birth', table: 'profile_private', label: 'Date of birth', type: 'date', required: true, help: 'You must be 21 or older. Only your age is shown.' },
      { key: 'city', table: 'profile_private', label: 'City', type: 'text', required: true, help: 'Private. Only your state is shown.' },
      { key: 'state', table: 'profiles', label: 'State', type: 'state', required: true },
      { key: 'phone', table: 'profile_private', label: 'Mobile phone', type: 'text', required: true, help: 'Private. Used to verify your account.' },
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
    ],
  },
  {
    id: 'preferences',
    title: 'Your preferences',
    fields: [
      { key: 'compensation_open', table: 'surrogate_details', label: 'Compensation', type: 'single', required: true, options: [{ value: 'true', label: 'Open to discuss' }, { value: 'false', label: 'I have a range in mind' }], boolean: true },
      { key: 'compensation_min_usd', table: 'surrogate_details', label: 'Range from (USD, optional)', type: 'number' },
      { key: 'compensation_max_usd', table: 'surrogate_details', label: 'Range to (USD, optional)', type: 'number' },
      { key: 'open_to_twins', table: 'surrogate_details', label: 'Open to carrying twins?', type: 'single', required: true, options: COMFORT, headlineTag: (v) => (v === 'comfortable' ? 'Open to twins' : null) },
      { key: 'termination_comfort', table: 'surrogate_details', label: 'Comfort with termination for medical reasons', type: 'single', required: true, options: COMFORT },
      { key: 'reduction_comfort', table: 'surrogate_details', label: 'Comfort with selective reduction', type: 'single', options: COMFORT },
      { key: 'relationship_level', table: 'surrogate_details', label: 'Relationship with intended parents', type: 'single', required: true, options: RELATIONSHIP_LEVEL, headlineTag: (v) => RELATIONSHIP_LEVEL.find((o) => o.value === v)?.label ?? null },
      { key: 'open_to_ip_types', table: 'surrogate_details', label: 'Open to working with', type: 'multi', options: [{ value: 'couples', label: 'Couples' }, { value: 'single_parents', label: 'Single parents' }, { value: 'lgbtq_families', label: 'LGBTQ+ families' }, { value: 'international', label: 'Parents living abroad' }], help: 'Choose all that apply. Leave blank if you are open to everyone.' },
      { key: 'carry_donor_embryos', table: 'surrogate_details', label: 'Willing to carry embryos made with donor eggs or sperm?', type: 'single', required: true, options: YES_NO_DISCUSS },
      { key: 'earliest_start', table: 'surrogate_details', label: 'Earliest you could start', type: 'date', required: true, headlineTag: (v) => (typeof v === 'string' && v ? `Ready ${new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : null) },
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
      { key: 'state', table: 'profiles', label: 'State', type: 'state', required: true },
      { key: 'phone', table: 'profile_private', label: 'Mobile phone', type: 'text', required: true, help: 'Private. Used to verify your account.' },
    ],
  },
  {
    id: 'journey',
    title: 'Your journey so far',
    fields: [
      { key: 'reason_for_surrogacy', table: 'ip_details', label: 'Why surrogacy?', type: 'single', options: [{ value: 'medical', label: 'Medical reasons' }, { value: 'same_sex_couple', label: 'Same-sex couple' }, { value: 'single_parent', label: 'Single parent by choice' }, { value: 'other', label: 'Other' }, PREFER_NOT] },
      { key: 'embryos_status', table: 'ip_details', label: 'Embryos', type: 'single', required: true, options: [{ value: 'created', label: 'Already created' }, { value: 'in_progress', label: 'In progress' }, { value: 'not_yet', label: 'Not yet' }], headlineTag: (v) => (v === 'created' ? 'Embryos ready' : v === 'in_progress' ? 'Embryos in progress' : null) },
      { key: 'genetic_material_source', table: 'ip_details', label: 'Source of genetic material (general)', type: 'single', options: [{ value: 'own', label: 'Our own' }, { value: 'donor_egg', label: 'Donor egg' }, { value: 'donor_sperm', label: 'Donor sperm' }, { value: 'donor_both', label: 'Donor egg and sperm' }, PREFER_NOT] },
      { key: 'clinic_name', table: 'ip_details', label: 'Fertility clinic', type: 'text', required: true, placeholder: 'Clinic name, or "still choosing"' },
      { key: 'embryo_count_range', table: 'ip_details', label: 'Number of embryos (optional)', type: 'single', options: [{ value: '1', label: '1' }, { value: '2_3', label: '2 to 3' }, { value: '4_plus', label: '4 or more' }, PREFER_NOT] },
      { key: 'children_hoped_for', table: 'ip_details', label: 'Children you hope for', type: 'single', required: true, options: [{ value: '1', label: 'One' }, { value: '2_plus', label: 'Two or more' }, { value: 'open', label: 'Open' }], headlineTag: (v) => (v === '1' ? 'First child' : null) },
      { key: 'open_to_twins', table: 'ip_details', label: 'Open to twins?', type: 'single', required: true, options: COMFORT, headlineTag: (v) => (v === 'comfortable' ? 'Open to twins' : null) },
      { key: 'desired_start', table: 'ip_details', label: 'When would you like to start?', type: 'date', required: true, headlineTag: (v) => (typeof v === 'string' && v ? `Hoping to start ${new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : null) },
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

export function stepsFor(role: Role): Step[] {
  return role === 'surrogate' ? SURROGATE_STEPS : IP_STEPS;
}

/** Non-questionnaire steps that every role goes through after the questions. */
export const FINAL_STEPS = ['photos', 'bio', 'review'] as const;
