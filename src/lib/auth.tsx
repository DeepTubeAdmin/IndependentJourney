/**
 * Session state for the whole app.
 *
 * Wrap the app in <SessionProvider>. Then any screen can call useSession()
 * to learn who is signed in and what their profile looks like.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

export type Role = 'surrogate' | 'intended_parent';
/** Every kind of login: members have a profile, agencies have an agency row. */
export type AccountRole = Role | 'agency';

export type AgencyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Agency = {
  id: string;
  name: string;
  website: string;
  logo_path: string;
  contact_name: string;
  status: AgencyStatus;
  review_note: string;
  is_complete: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  role: Role;
  display_name: string;
  last_initial: string;
  state: string;
  bio: string;
  headline_tags: string[];
  visibility: 'members_only' | 'public_previews';
  featured_opt_in: boolean;
  is_complete: boolean;
  is_verified: boolean;
  /** Independent member, independent member who also works with an agency, or agency-posted. */
  profile_type: 'independent' | 'with_agency' | 'agency';
  agency_name: string;
  journey_types: 'independent_only' | 'agency_only' | 'both';
  managed_by: string | null;
  /** Approximate location from ZIP (null until the member adds one). */
  approx_lat?: number | null;
  approx_lng?: number | null;
  last_active_at?: string;
};

type SessionState = {
  /** True while we're still finding out whether someone is signed in. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Set when the login is an agency account (then profile is null). */
  agency: Agency | null;
  /** True once the profile lookup for the current session has finished (so "no profile" is meaningful). */
  profileChecked: boolean;
  /** Re-reads the profile from the database (call after saving). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  // Which user the profile lookup last finished for. "Checked" means it matches
  // the current session, so screens can tell "no profile" from "still loading".
  // It must stay true during a refresh (refreshProfile, token refresh): flipping
  // it off unmounts every member screen for a moment, which broke navigation.
  const [checkedFor, setCheckedFor] = useState<string | null | undefined>(undefined);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!supabase || !userId) {
      setProfile(null);
      setAgency(null);
      setCheckedFor(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
    // No profile: maybe this login is an agency.
    if (!data) {
      const { data: ag } = await supabase.from('agencies').select('id, name, website, logo_path, contact_name, status, review_note, is_complete, created_at').eq('id', userId).maybeSingle();
      setAgency((ag as Agency | null) ?? null);
    } else {
      setAgency(null);
    }
    setCheckedFor(userId);
  }, []);
  const profileChecked = checkedFor !== undefined && checkedFor === (session?.user.id ?? null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
      // Tell the database this member is active (it records at most once an hour).
      if (data.session) supabase?.rpc('touch_activity').then(() => {});
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      await loadProfile(next?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<SessionState>(
    () => ({
      loading,
      session,
      profile,
      agency,
      profileChecked,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [loading, session, profile, agency, profileChecked, loadProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** Turns a Supabase error into a sentence a person can act on. */
export function friendlyAuthError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match. Check both and try again.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for our message.';
  if (m.includes('already registered')) return 'There is already an account with that email. Try logging in instead.';
  if (m.includes('password should be')) return 'Your password needs at least 8 characters.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Too many attempts. Please wait a minute and try again.';
  return message;
}
