/**
 * Members reporting other members. The "Report" button appears on profile
 * and message screens in later phases; the database side is ready now.
 */
import { supabase } from '@/lib/supabase';

export type ReportReason = 'scam_or_money' | 'agency_or_recruiter' | 'harassment' | 'fake_profile' | 'inappropriate_content' | 'other';

export const REPORT_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'scam_or_money', label: 'Asked for money or seems like a scam' },
  { value: 'agency_or_recruiter', label: 'Seems to be an agency or recruiter' },
  { value: 'harassment', label: 'Harassment or pressure' },
  { value: 'fake_profile', label: 'Fake profile or stolen photos' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

/** Files a report. Returns an error message, or null on success. */
export async function reportMember(reporterId: string, reportedId: string, reason: ReportReason, details: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured.';
  const { error } = await supabase.from('reports').insert({ reporter_id: reporterId, reported_id: reportedId, reason, details: details.trim().slice(0, 2000) });
  return error ? error.message : null;
}
