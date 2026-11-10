/**
 * Email preferences and saved searches (Phase 8a). The database queues every
 * email; this file only reads and writes the member's choices.
 */
import { supabase } from '@/lib/supabase';

import type { BrowseFilters } from '@/lib/browse';

export type NotificationSettings = { new_messages: boolean; membership: boolean; saved_searches: boolean; nudges: boolean };

export const NOTIFICATION_LABELS: { key: keyof NotificationSettings; label: string; help: string }[] = [
  { key: 'new_messages', label: 'New messages', help: 'When someone writes to you. At most one email per conversation per hour.' },
  { key: 'membership', label: 'Membership', help: 'Receipts, a reminder a week before your membership ends, and when it ends.' },
  { key: 'saved_searches', label: 'Saved-search alerts', help: 'A daily email when new profiles match a search you saved.' },
  { key: 'nudges', label: 'Tips and reminders', help: 'An occasional nudge, such as a reminder to verify your identity.' },
];

export async function myNotificationSettings(): Promise<NotificationSettings> {
  const all = { new_messages: true, membership: true, saved_searches: true, nudges: true };
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
  const keep: (keyof BrowseFilters)[] = ['state', 'verified_only', 'open_to_twins', 'compensation_open', 'willing_to_travel', 'relationship_level', 'family_structure', 'embryos_status'];
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
  return parts.join(' · ') || 'Everyone';
}
