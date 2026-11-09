/**
 * App-wide settings.
 *
 * The real, live values for price, membership term, and limits are stored in
 * the `app_settings` table in Supabase so an admin can change them without a
 * code release. The values below are only safe fallbacks used if the database
 * can't be reached (and for display while settings load).
 *
 * Do not hardcode the price anywhere else in the app: import from here, or
 * read the `app_settings` table.
 */
export const DEFAULT_SETTINGS = {
  membership: {
    priceUsd: 199,
    termMonths: 3,
  },
  limits: {
    // New conversations a surrogate can start per day.
    newConversationsPerDayVerified: 10,
    newConversationsPerDayUnverified: 3,
  },
  // Empty list means every US state is allowed.
  allowedStates: [] as string[],
} as const;

export const SITE = {
  name: 'Independent Journey',
  domain: 'IndependentJourney.com',
  url: 'https://independentjourney.com',
  tagline: 'Where intended parents and surrogates meet, on their own terms.',
} as const;

/**
 * Version label of the legal documents (Terms, Privacy Policy, Disclaimer,
 * message-review notice). Bump it when the attorney-approved text changes so
 * we know which version each member agreed to.
 */
export const LEGAL_VERSION = '2026-11-draft';
