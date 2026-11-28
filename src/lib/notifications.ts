/**
 * Email preferences and saved searches (Phase 8a). The database queues every
 * email; this file only reads and writes the member's choices.
 */
import { supabase } from '@/lib/supabase';

import type { BrowseFilters } from '@/lib/browse';

/** The first four are emails; push_messages is the phone-app notification for new messages. */
export type NotificationSettings = { new_messages: boolean; membership: boolean; saved_searches: boolean; nudges: boolean; push_messages: boolean };
type EmailKey = Exclude<keyof NotificationSettings, 'push_messages'>;

export const NOTIFICATION_LABELS: { key: EmailKey; label: string; help: string }[] = [
  { key: 'new_messages', label: 'New messages', help: 'When someone writes to you. At most one email per conversation per hour.' },
  { key: 'saved_searches', label: 'Saved-search alerts', help: 'A daily email when new profiles match a search you saved.' },
  { key: 'nudges', label: 'Tips and reminders', help: 'An occasional nudge, such as a reminder to finish your profile or verify your identity.' },
];

export async function myNotificationSettings(): Promise<NotificationSettings> {
  const all = { new_messages: true, membership: true, saved_searches: true, nudges: true, push_messages: true };
  if (!supabase) return all;
  const { data } = await supabase.rpc('my_notification_settings');
  return { ...all, ...((data as Partial<NotificationSettings>) ?? {}) };
}

export async function saveNotificationSettings(s: NotificationSettings): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { error } = await supabase.rpc('set_notification_settings', { p: s });
  return error ? error.message : null;
}

export type SavedSearch = { id: number; name: string; filters: BrowseFilters; alerts: boolean; created_at: string };

export async function listSavedSearches(): Promise<SavedSearch[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('saved_searches').select('id, name, filters, alerts, created_at').order('created_at', { ascending: false });
  return (data ?? []) as SavedSearch[];
}

/** Keeps only the filters that describe profiles (not sorting or paging). */
export function alertableFilters(f: BrowseFilters): BrowseFilters {
  const keep: (keyof BrowseFilters)[] = ['state', 'verified_only', 'open_to_twins', 'compensation_open', 'willing_to_travel', 'relationship_level', 'family_structure', 'embryos_status', 'experienced', 'termination_comfort', 'untested_embryos_ok', 'carry_donor_embryos', 'international_ips_ok', 'comp_max', 'open_to_ip_type', 'embryos_tested', 'consulted_attorney', 'experience', 'age_min', 'age_max'];
  return Object.fromEntries(Object.entries(f).filter(([k, v]) => keep.includes(k as keyof BrowseFilters) && v !== undefined && v !== null && v !== '' && v !== false)) as BrowseFilters;
}

export async function saveSearch(userId: string, name: string, filters: BrowseFilters): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { error } = await supabase.from('saved_searches').insert({ user_id: userId, name: name.trim().slice(0, 60) || 'My search', filters: alertableFilters(filters) });
  return error ? error.message : null;
}

export async function setSearchAlerts(id: number, alerts: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from('saved_searches').update({ alerts }).eq('id', id);
}

export async function deleteSearch(id: number): Promise<void> {
  if (!supabase) return;
  await supabase.from('saved_searches').delete().eq('id', id);
}

/** "Texas · Verified · Open to twins" from a filter set, for lists. */
export function describeFilters(f: BrowseFilters): string {
  const parts: string[] = [];
  if (f.state) parts.push(f.state);
  if (f.verified_only) parts.push('Verified only');
  if (f.open_to_twins) parts.push('Open to twins');
  if (f.willing_to_travel) parts.push('Willing to travel');
  if (f.compensation_open) parts.push('Open on compensation');
  if (f.relationship_level) parts.push(`Relationship: ${f.relationship_level.replace(/_/g, ' ')}`);
  if (f.family_structure) parts.push(f.family_structure === 'couple' ? 'Couples' : 'Single parents');
  if (f.embryos_status) parts.push(`Embryos: ${f.embryos_status.replace(/_/g, ' ')}`);
  if (f.termination_comfort) parts.push(`Termination: ${f.termination_comfort.replace(/_/g, ' ')}`);
  if (f.experienced || f.experience === 'experienced') parts.push('Experienced surrogate');
  if (f.experience === 'first_time') parts.push('First-time surrogate');
  if (f.age_min || f.age_max) parts.push(f.age_min && f.age_max ? `Age ${f.age_min} to ${f.age_max}` : f.age_min ? `Age ${f.age_min}+` : `Age up to ${f.age_max}`);
  if (f.comp_max) parts.push(`Compensation up to $${Math.round(f.comp_max / 1000)}k`);
  if (f.untested_embryos_ok) parts.push('Untested embryos OK');
  if (f.carry_donor_embryos) parts.push('Donor embryos OK');
  if (f.international_ips_ok) parts.push('Open to international parents');
  if (f.open_to_ip_type) parts.push(f.open_to_ip_type === 'single_parents' ? 'Open to single parents' : 'Open to LGBTQ+ families');
  if (f.embryos_tested) parts.push('Embryos tested');
  if (f.consulted_attorney) parts.push('Consulted an attorney');
  return parts.join(' · ') || 'Everyone';
}
