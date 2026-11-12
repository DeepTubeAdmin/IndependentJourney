/**
 * Browsing, previews, saved profiles and share links (Phase 5).
 * The database decides what each viewer may see; this file just asks it.
 */
import { IP_STEPS, SURROGATE_STEPS, type Field } from '@/config/questionnaire';
import { supabase } from '@/lib/supabase';

export type PreviewRow = {
  id: string;
  role: 'surrogate' | 'intended_parent';
  display_name: string;
  state: string;
  is_verified: boolean;
  headline_tags: string[];
  preview_photo_path: string | null;
  /** Every photo, in display order (migration 17: previews show all photos). */
  photo_paths?: string[] | null;
  created_at: string;
  /** Approximate location (ZIP area), if the member gave a ZIP. */
  approx_lat?: number | null;
  approx_lng?: number | null;
  recently_active?: boolean;
  /** Miles from the viewer's approximate location, when both are known. */
  distance_miles?: number | null;
  /** Independent, independent-with-an-agency, or posted by an agency account. */
  profile_type?: 'independent' | 'with_agency' | 'agency';
  agency_name?: string | null;
  agency_logo_path?: string | null;
  /** Filled in by withPreviewUrls(): the first photo, and all photos. */
  photo_url?: string;
  photo_urls?: string[];
};

/** The short label shown on cards and profiles: who stands behind this profile. */
export function profileTypeLabel(r: { profile_type?: string | null; agency_name?: string | null }): string {
  if (r.profile_type === 'agency') return r.agency_name ? `Agency: ${r.agency_name}` : 'Agency';
  if (r.profile_type === 'with_agency') return r.agency_name ? `Independent, with ${r.agency_name}` : 'Independent, with an agency';
  return 'Independent';
}

export type BrowseFilters = {
  role?: 'surrogate' | 'intended_parent';
  state?: string;
  verified_only?: boolean;
  open_to_twins?: string;
  compensation_open?: boolean;
  willing_to_travel?: string;
  relationship_level?: string;
  start_before?: string;
  family_structure?: string;
  embryos_status?: string;
  id?: string;
  /** 'independent' (own profiles, with or without an agency) or 'agency' (posted by an agency). */
  profile_type?: 'independent' | 'agency';
  /** 'active' (default): recently active first. 'distance': closest first (active still first). */
  sort?: 'active' | 'distance';
  near_lat?: number;
  near_lng?: number;
  radius_miles?: number;
};

/** Removes empty filter values so the database treats them as "any". */
function clean(f: BrowseFilters): Record<string, unknown> {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false));
}

export async function browseProfiles(filters: BrowseFilters, limit = 24, offset = 0): Promise<PreviewRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('browse_profiles', { p_filters: clean(filters), p_limit: limit, p_offset: offset });
  return withPreviewUrls((data ?? []) as PreviewRow[]);
}

export async function featuredProfiles(limit = 6): Promise<PreviewRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('featured_profiles', { p_limit: limit });
  return withPreviewUrls((data ?? []) as PreviewRow[]);
}

/** Adds short-lived signed URLs for every preview photo. */
export async function withPreviewUrls(rows: PreviewRow[]): Promise<PreviewRow[]> {
  if (!supabase) return rows;
  const pathsOf = (r: PreviewRow) => (r.photo_paths && r.photo_paths.length ? r.photo_paths : r.preview_photo_path ? [r.preview_photo_path] : []);
  const paths = Array.from(new Set(rows.flatMap(pathsOf)));
  if (paths.length === 0) return rows;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrls(paths, 60 * 30);
  const byPath = new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => {
    const urls = pathsOf(r).map((p) => byPath.get(p)).filter((u): u is string => Boolean(u));
    return { ...r, photo_url: urls[0], photo_urls: urls };
  });
}

/** Public details of the agency behind an agency-posted profile (no contact details). */
export async function loadAgencyCard(profileId: string): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const { data: p } = await supabase.from('profiles').select('managed_by').eq('id', profileId).maybeSingle();
  const agencyId = (p as { managed_by?: string | null } | null)?.managed_by;
  if (!agencyId) return null;
  const { data } = await supabase.rpc('agency_card', { p_agency: agencyId });
  return (data as Record<string, unknown> | null) ?? null;
}

export type Access = 'none' | 'preview' | 'full';

export async function myAccessTo(profileId: string): Promise<Access> {
  if (!supabase) return 'none';
  const { data } = await supabase.rpc('my_access_to', { p_target: profileId });
  return (data as Access) ?? 'none';
}

/** Full profile for a viewer the database allows (RLS enforces it). */
export async function loadFullProfile(profileId: string) {
  if (!supabase) return null;
  const [{ data: profile }, { data: sd }, { data: ipd }, { data: parents }, { data: photos }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    supabase.from('surrogate_details').select('*').eq('id', profileId).maybeSingle(),
    supabase.from('ip_details').select('*').eq('id', profileId).maybeSingle(),
    supabase.from('ip_parents').select('*').eq('profile_id', profileId).order('position'),
    supabase.from('photos').select('storage_path, position').eq('profile_id', profileId).order('position'),
  ]);
  if (!profile) return null;
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from('profile-photos').createSignedUrls(paths, 60 * 30) : { data: [] };
  return {
    profile,
    surrogate: sd,
    ip: ipd,
    parents: parents ?? [],
    photoUrls: (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[],
  };
}

// ---------------------------------------------------------------------------
// Saved profiles (private bookmarks). No "interest" or matching: members who
// want to connect simply send a message.
// ---------------------------------------------------------------------------
export async function saveProfile(userId: string, profileId: string): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { error } = await supabase.from('saved_profiles').insert({ user_id: userId, profile_id: profileId });
  if (!error || error.code === '23505') return null;
  return error.message;
}

export async function unsaveProfile(userId: string, profileId: string) {
  await supabase?.from('saved_profiles').delete().eq('user_id', userId).eq('profile_id', profileId);
}

export async function listSavedIds(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('saved_profiles').select('profile_id').eq('user_id', userId).order('created_at', { ascending: false });
  return (data ?? []).map((r) => r.profile_id as string);
}

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------
export async function getShareLink(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('share_links').select('token').eq('profile_id', userId).is('revoked_at', null).maybeSingle();
  return data?.token ?? null;
}

export async function createShareLink(): Promise<{ token?: string; error?: string }> {
  if (!supabase) return { error: 'Not connected.' };
  const { data, error } = await supabase.rpc('create_share_link');
  if (error) return { error: error.code === '42501' ? 'Share links unlock once your profile is complete and verified.' : error.message };
  return { token: data as string };
}

export async function revokeShareLink(userId: string) {
  await supabase?.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('profile_id', userId).is('revoked_at', null);
}

export async function loadShareView(token: string) {
  if (!supabase) return null;
  const { data } = await supabase.rpc('share_view', { p_token: token });
  if (!data) return null;
  const view = data as Record<string, any>;
  const paths: string[] = view.photos ?? [];
  const { data: signed } = paths.length ? await supabase.storage.from('profile-photos').createSignedUrls(paths, 60 * 30) : { data: [] };
  return { ...view, photoUrls: (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[] };
}

/** Turns stored answers into readable "Label: value" pairs for the full profile. */
/** "Compensation range: $40,000 – $55,000" (or "Open to discuss"). Null when nothing to show. */
export function compensationLine(sd: Record<string, unknown> | null | undefined): string | null {
  if (!sd) return null;
  const lo = sd.compensation_min_usd as number | null | undefined;
  const hi = sd.compensation_max_usd as number | null | undefined;
  const fmt = (n: number) => '$' + Number(n).toLocaleString('en-US');
  if (lo && hi) return `${fmt(lo)} – ${fmt(hi)}`;
  if (lo) return `From ${fmt(lo)}`;
  if (hi) return `Up to ${fmt(hi)}`;
  return sd.compensation_open ? 'Open to discuss' : null;
}

/** Nicer labels than the raw column names where title-casing is not enough. */
const LABEL_OVERRIDES: Record<string, string> = {
  us_resident: 'US resident',
  background_check: 'Can pass a background check',
  ob_cleared: 'OB clearance',
  clinic_cleared: 'Clinic clearance',
  clearance_clinic: 'Clinic',
  journeys_completed: 'Journeys completed',
  cycle_preference: 'Preferred cycle',
  open_to_ip_types: 'Open to working with',
  carry_donor_embryos: 'Carry donor embryos',
  earliest_start: 'Earliest start',
  desired_start: 'Hoped-for start',
  consulted_attorney: 'Has consulted an attorney',
  aware_of_birth_state_law: 'Aware of birth-state law',
  embryos_status: 'Embryos',
  embryo_count_range: 'Number of embryos',
  genetic_material_source: 'Genetic material',
  reason_for_surrogacy: 'Why surrogacy',
  surrogate_location_pref: 'Surrogate location preference',
  other_preferences: 'Other preferences',
};

/** Columns that are bookkeeping, never shown on a profile. */
const HIDDEN_KEYS = ['id', 'created_at', 'updated_at'];

/** Every questionnaire field by key, so answers show the same words as the form. */
const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries([...SURROGATE_STEPS, ...IP_STEPS].flatMap((s) => s.fields).map((f) => [f.key, f]));

/** A stored value as the member chose it on the form: option labels, Yes/No, "February 2027", "$1,000". */
export function prettyValue(key: string, v: unknown): string {
  const field = FIELD_BY_KEY[key];
  const optionLabel = (x: unknown) => field?.options?.find((o) => o.value === x)?.label ?? String(x).replace(/_/g, ' ');
  if (Array.isArray(v)) return v.map(optionLabel).join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (key.endsWith('_usd')) return '$' + Number(v).toLocaleString('en-US');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (field?.options) return optionLabel(v);
  // Free text: shown as typed, with a capital first letter.
  const text = String(v).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function prettyLabel(key: string): string {
  return LABEL_OVERRIDES[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Rows for a profile's "About the journey" section, in questionnaire order. */
export function prettyAnswers(obj: Record<string, unknown> | null | undefined, skip: string[] = []): { label: string; value: string }[] {
  if (!obj) return [];
  const order = Object.keys(FIELD_BY_KEY);
  return Object.entries(obj)
    .filter(([k, v]) => !skip.includes(k) && !HIDDEN_KEYS.includes(k) && v !== null && v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0))
    .sort(([a], [b]) => (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b)))
    .map(([k, v]) => ({ label: prettyLabel(k), value: prettyValue(k, v) }));
}
