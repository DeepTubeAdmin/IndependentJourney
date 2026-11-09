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
  /** Re-reads the profile from the database (call after saving). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

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
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [loading, session, profile, loadProfile],
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
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  return message;
}
