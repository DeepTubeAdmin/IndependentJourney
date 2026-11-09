/**
 * Browsing, previews, saved profiles and share links (Phase 5).
 * The database decides what each viewer may see; this file just asks it.
 */
import { supabase } from '@/lib/supabase';

export type PreviewRow = {
  id: string;
  role: 'surrogate' | 'intended_parent';
  display_name: string;
  state: string;
  is_verified: boolean;
  headline_tags: string[];
  preview_photo_path: string | null;
  created_at: string;
  /** Approximate location (ZIP area), if the member gave a ZIP. */
  approx_lat?: number | null;
  approx_lng?: number | null;
  recently_active?: boolean;
  /** Miles from the viewer's approximate location, when both are known. */
  distance_miles?: number | null;
  /** Filled in by withPreviewUrls(). */
  photo_url?: string;
};

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

/** Adds short-lived signed URLs for the tiny preview photos. */
export async function withPreviewUrls(rows: PreviewRow[]): Promise<PreviewRow[]> {
  if (!supabase) return rows;
  const paths = rows.map((r) => r.preview_photo_path).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return rows;
  const { data } = await supabase.storage.from('profile-photos').createSignedUrls(paths, 60 * 30);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, photo_url: r.preview_photo_path ? byPath.get(r.preview_photo_path) ?? undefined : undefined }));
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

export function prettyAnswers(obj: Record<string, unknown> | null | undefined, skip: string[] = []): { label: string; value: string }[] {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([k, v]) => !skip.includes(k) && k !== 'id' && v !== null && v !== '' && v !== undefined)
    .map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      value: Array.isArray(v)
        ? v.join(', ')
        : typeof v === 'boolean'
          ? (v ? 'Yes' : 'No')
          : k.endsWith('_usd')
            ? '$' + Number(v).toLocaleString('en-US')
            : String(v).replace(/_/g, ' '),
    }));
}
