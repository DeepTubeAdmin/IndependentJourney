/**
 * Agency accounts: the dashboard data, client profiles and logo upload.
 * An agency login has no profile row; its client profiles are ordinary
 * profiles with managed_by = the agency's id (see migration 23).
 */
import type { Role } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type AgencyClient = {
  id: string;
  role: Role;
  display_name: string;
  state: string;
  is_complete: boolean;
  is_verified: boolean;
  created_at: string;
  photo_path: string | null;
  unread: number;
};

export type MyAgency = {
  id: string;
  name: string;
  website: string;
  logo_path: string;
  contact_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  review_note: string;
  is_complete: boolean;
  paid_until: string | null;
  /** False when agencies are paid and this one has not paid (always true while agencies are free). */
  has_access: boolean;
  pricing_mode: 'free' | 'subscription' | 'per_profile' | 'both';
  profiles: AgencyClient[];
};

/** The signed-in agency's row plus its client profiles, or null when the login is not an agency. */
export async function myAgency(): Promise<MyAgency | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('my_agency');
  return (data as MyAgency | null) ?? null;
}

/** Creates an empty client profile for the agency to fill in. Returns the new id or an error message. */
export async function createClientProfile(role: Role): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: 'Not connected.' };
  const { data, error } = await supabase.rpc('agency_create_profile', { p_role: role });
  if (error) return { error: friendlyAgencyError(error.message) };
  return { id: String(data) };
}

/** Removes a client profile for good: photo files first, then the database rows. */
export async function deleteClientProfile(id: string): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { data: files } = await supabase.storage.from('profile-photos').list(id);
  if (files && files.length > 0) await supabase.storage.from('profile-photos').remove(files.map((f) => `${id}/${f.name}`));
  const { error } = await supabase.rpc('agency_delete_profile', { p_id: id });
  return error ? error.message : null;
}

/** Uploads the agency logo to agency-logos/<agency id>/logo.<ext> and records the path. */
export async function uploadLogo(agencyId: string, uri: string): Promise<string | null> {
  if (!supabase) return 'Not connected to storage.';
  const res = await fetch(uri);
  const blob = await res.blob();
  if (blob.size > 2 * 1024 * 1024) return 'Please choose a logo under 2 MB.';
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/svg+xml' ? 'svg' : 'jpg';
  const path = `${agencyId}/logo.${ext}`;
  const { error: upErr } = await supabase.storage.from('agency-logos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (upErr) return upErr.message;
  const { error } = await supabase.from('agencies').update({ logo_path: path }).eq('id', agencyId);
  return error ? error.message : null;
}

export async function removeLogo(agencyId: string, path: string): Promise<void> {
  if (!supabase || !path) return;
  await supabase.storage.from('agency-logos').remove([path]);
  await supabase.from('agencies').update({ logo_path: '' }).eq('id', agencyId);
}

/** Public URL of a logo in the public agency-logos bucket. */
export function logoUrl(path: string | null | undefined): string | undefined {
  if (!supabase || !path) return undefined;
  return supabase.storage.from('agency-logos').getPublicUrl(path).data.publicUrl;
}

function friendlyAgencyError(msg: string): string {
  if (msg.includes('agency_not_approved')) return 'Your agency is not approved yet. We email you as soon as it is.';
  if (msg.includes('agency_details_incomplete')) return 'Finish your agency details first.';
  if (msg.includes('agency_payment_required')) return 'An agency subscription is needed to add profiles.';
  return msg;
}
