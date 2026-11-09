/**
 * Everything the admin dashboard needs from Supabase.
 *
 * Admin actions call database functions (admin_* in migration 3). Each one
 * checks that the caller is an admin who has passed two-factor auth and
 * writes an audit-log row, so the app never changes member data directly.
 */
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type MemberRow = {
  id: string;
  role: 'surrogate' | 'intended_parent';
  display_name: string;
  last_initial: string;
  state: string;
  email: string;
  is_complete: boolean;
  is_verified: boolean;
  banned_at: string | null;
  suspended_until: string | null;
  created_at: string;
  open_flags: number;
  open_reports: number;
};

export type Report = {
  id: number;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolution_note: string;
  reported?: { display_name: string; role: string } | null;
};

export type Flag = {
  id: number;
  profile_id: string;
  kind: string;
  note: string;
  created_by: string | null;
  created_at: string;
  cleared_at: string | null;
  profile?: { display_name: string; role: string } | null;
};

export type AdminMessageRow = {
  id: number;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  body: string;
  scam_flags: string[];
  admin_hidden: boolean;
  created_at: string;
};

export type AuditRow = {
  id: number;
  admin_id: string;
  action: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const REPORT_REASONS: Record<string, string> = {
  scam_or_money: 'Scam or asked for money',
  agency_or_recruiter: 'Agency or recruiter',
  harassment: 'Harassment',
  fake_profile: 'Fake profile',
  inappropriate_content: 'Inappropriate content',
  other: 'Other',
};

export const FLAG_KINDS: Record<string, string> = {
  agency_suspected: 'Agency suspected',
  fraud_suspected: 'Fraud suspected',
  contact_info_in_profile: 'Contact info in profile',
  duplicate_photos: 'Duplicate photos',
  other: 'Other',
};

/** Human-readable status for a member row. */
export function memberStatus(m: { banned_at: string | null; suspended_until: string | null }): string {
  if (m.banned_at) return 'Banned';
  if (m.suspended_until && new Date(m.suspended_until) > new Date()) return `Suspended until ${new Date(m.suspended_until).toLocaleDateString()}`;
  return 'Active';
}

// ---------------------------------------------------------------------------
// Calls into the database
// ---------------------------------------------------------------------------
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? friendlyAdminError(error.message) : null };
}

function friendlyAdminError(message: string): string {
  if (message.toLowerCase().includes('two-factor')) return 'Your admin session has expired. Confirm your authenticator code again.';
  return message;
}

export const admin = {
  amICandidate: () => rpc<boolean>('am_i_admin_candidate'),
  overview: () => rpc<Record<string, number>>('admin_overview'),
  searchMembers: (q: string, limit = 50, offset = 0) => rpc<MemberRow[]>('admin_search_members', { p_query: q.trim(), p_limit: limit, p_offset: offset }),
  memberDetail: (id: string) => rpc<Record<string, any>>('admin_member_detail', { p_target: id }),
  setVerified: (id: string, verified: boolean, reason: string) => rpc<void>('admin_set_verified', { p_target: id, p_verified: verified, p_reason: reason }),
  setStatus: (id: string, action: 'suspend' | 'unsuspend' | 'ban' | 'unban', reason: string, until?: Date) =>
    rpc<void>('admin_set_member_status', { p_target: id, p_action: action, p_reason: reason, p_until: until ? until.toISOString() : null }),
  addFlag: (id: string, kind: string, note: string) => rpc<number>('admin_add_flag', { p_target: id, p_kind: kind, p_note: note }),
  clearFlag: (flagId: number, note: string) => rpc<void>('admin_clear_flag', { p_flag_id: flagId, p_note: note }),
  resolveReport: (reportId: number, status: Report['status'], note: string) => rpc<void>('admin_resolve_report', { p_report_id: reportId, p_status: status, p_note: note }),
  setSetting: (key: string, value: unknown) => rpc<void>('admin_set_setting', { p_key: key, p_value: value }),
  grantMembership: (id: string, months: number, reason: string) => rpc<void>('admin_grant_membership', { p_target: id, p_months: months, p_reason: reason }),
  endMembership: (id: string, reason: string) => rpc<void>('admin_end_membership', { p_target: id, p_reason: reason }),
  // Message review: every call is written to the audit log by the database.
  searchMessages: (q: string, member: string | null, flaggedOnly: boolean, limit = 50, offset = 0) =>
    rpc<AdminMessageRow[]>('admin_search_messages', { p_query: q.trim(), p_member: member, p_flagged_only: flaggedOnly, p_limit: limit, p_offset: offset }),
  conversation: (id: string) => rpc<Record<string, any>>('admin_conversation', { p_conversation: id }),
  hideMessage: (id: number, hidden: boolean, reason: string) => rpc<void>('admin_hide_message', { p_message: id, p_hidden: hidden, p_reason: reason }),
  warnMember: (id: string, body: string, reason: string) => rpc<void>('admin_warn_member', { p_target: id, p_body: body, p_reason: reason }),

  async listReports(openOnly: boolean): Promise<Report[]> {
    if (!supabase) return [];
    let q = supabase.from('reports').select('*, reported:profiles!reports_reported_id_fkey(display_name, role)').order('created_at', { ascending: false }).limit(200);
    if (openOnly) q = q.in('status', ['open', 'reviewing']);
    const { data } = await q;
    return (data ?? []) as Report[];
  },
  async listFlags(openOnly: boolean): Promise<Flag[]> {
    if (!supabase) return [];
    let q = supabase.from('member_flags').select('*, profile:profiles!member_flags_profile_id_fkey(display_name, role)').order('created_at', { ascending: false }).limit(200);
    if (openOnly) q = q.is('cleared_at', null);
    const { data } = await q;
    return (data ?? []) as Flag[];
  },
  async listAudit(limit = 200): Promise<AuditRow[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data ?? []) as AuditRow[];
  },
  async listSettings(): Promise<{ key: string; value: unknown; description: string }[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('app_settings').select('key, value, description').order('key');
    return (data ?? []) as { key: string; value: unknown; description: string }[];
  },
  async photoUrls(paths: string[]): Promise<string[]> {
    if (!supabase || paths.length === 0) return [];
    const { data } = await supabase.storage.from('profile-photos').createSignedUrls(paths, 600);
    return (data ?? []).map((d) => d.signedUrl ?? '');
  },
};

// ---------------------------------------------------------------------------
// Two-factor authentication (authenticator app) for admins
// ---------------------------------------------------------------------------
export type Aal = 'aal1' | 'aal2' | null;

export const mfa = {
  /** Current level ('aal2' = code confirmed this session) and whether a factor is enrolled. */
  async status(): Promise<{ aal: Aal; enrolled: boolean; factorId: string | null }> {
    if (!supabase) return { aal: null, enrolled: false, factorId: null };
    const [{ data: level }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    const verified = factors?.totp.find((f) => f.status === 'verified') ?? null;
    return { aal: (level?.currentLevel as Aal) ?? null, enrolled: Boolean(verified), factorId: verified?.id ?? null };
  },
  /** Starts enrolment: returns the QR code image and secret to show once. */
  async enroll(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };
    // Remove any half-finished enrolments so the user isn't stuck.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Independent Journey admin' });
    if (error || !data) return { error: error?.message ?? 'Could not start enrolment.' };
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  },
  /** Confirms a 6-digit code (used for both first enrolment and later logins). */
  async verify(factorId: string, code: string): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.';
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) return e1?.message ?? 'Could not start the check.';
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    if (e2) return e2.message.toLowerCase().includes('invalid') ? 'That code was not accepted. Codes change every 30 seconds; try the current one.' : e2.message;
    return null;
  },
};

/** Loads data once and exposes a reload function. Keeps screens short. */
export function useAdminData<T>(loader: () => Promise<{ data: T | null; error: string | null } | T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    const r = await loader();
    if (r && typeof r === 'object' && 'error' in (r as object) && 'data' in (r as object)) {
      const rr = r as { data: T | null; error: string | null };
      setData(rr.data);
      setError(rr.error);
    } else {
      setData(r as T);
      setError(null);
    }
    setLoading(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload };
}
