/**
 * Google and Apple sign-in (web). The browser is sent to the provider, comes
 * back to /welcome with a session, and the app then checks whether a profile
 * exists. A brand-new social member has none, so they finish sign-up on the
 * "Finish your account" screen (role + agreement), which calls complete_signup.
 *
 * To keep that step short, the sign-up page remembers the role and the
 * agreement the member already gave before leaving for Google or Apple.
 *
 * Phone apps (Phase 8b) will use the native sheets and signInWithIdToken
 * instead of a browser redirect; this file is web-only for now.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/auth';

export type SocialProvider = 'google' | 'apple';

export const SOCIAL_LABEL: Record<SocialProvider, string> = { google: 'Continue with Google', apple: 'Continue with Apple' };

export type PendingSignup = { role: Role; legal_version: string; agreed: boolean; at: number };
const KEY = 'ij_pending_signup';

/** Social buttons only work in a browser until the phone apps add native sign-in. */
export const socialAvailable = Platform.OS === 'web';

export async function rememberPendingSignup(p: Omit<PendingSignup, 'at'>) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() })); } catch { /* storage blocked: the finish screen asks again */ }
}

export async function readPendingSignup(): Promise<PendingSignup | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingSignup;
    // Older than a day: ask again rather than trust a stale choice.
    if (!p.at || Date.now() - p.at > 24 * 60 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

export async function clearPendingSignup() {
  try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Sends the browser to Google or Apple. Returns an error message, or null when the redirect started. */
export async function startSocialSignIn(provider: SocialProvider): Promise<string | null> {
  if (!supabase) return 'The app is not connected to a database yet.';
  if (!socialAvailable) return 'Google and Apple sign-in are coming to the apps soon. Please use email for now.';
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/welcome` },
  });
  return error ? error.message : null;
}

/** Creates the profile for a social sign-up. Returns an error message or null. */
export async function completeSignup(role: Role, legalVersion: string): Promise<string | null> {
  if (!supabase) return 'The app is not connected to a database yet.';
  const { error } = await supabase.rpc('complete_signup', { p_role: role, p_legal_version: legalVersion });
  if (error) return error.message;
  await clearPendingSignup();
  return null;
}
