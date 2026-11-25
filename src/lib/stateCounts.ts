/**
 * Live member counts for the public state pages. Two numbers only (see
 * migration 40); no profile details. Returns null if the count cannot be read,
 * so the page simply leaves the numbers out.
 */
import { supabase } from '@/lib/supabase';

export type StateCounts = { surrogates: number; intended_parents: number };

export async function stateMemberCounts(code: string): Promise<StateCounts | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('state_member_counts', { p_state: code });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as StateCounts | undefined;
  return row ? { surrogates: row.surrogates ?? 0, intended_parents: row.intended_parents ?? 0 } : null;
}
