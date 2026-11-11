/**
 * Google and Apple sign-in (web). The browser is sent to the provider, comes
 * back to /welcome with a session, and the app then checks whether a profile
 * exists. A brand-new social member has none, so they finish sign-up on the
 * "Finish your account" screen (role + agreement), which calls complete_signup.
 *
 * To keep that step short, the sign-up page remembers the role and the
 * agreement the member already gave before leaving for Google or Apple.
 *
 * Google uses Google's own sign-in popup (Google Identity Services) when
 * EXPO_PUBLIC_GOOGLE_CLIENT_ID is set, so the popup says "independentjourney.com"
 * / "Independent Journey" instead of our database host. Google returns an ID
 * token, which we hand to Supabase with signInWithIdToken (nonce-checked).
 * Without that setting we fall back to the Supabase redirect.
 *
 * Phone apps (Phase 8b) will use the native sheets with the same
 * signInWithIdToken call; this file is web-only for now.
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

/** Google OAuth "Web application" client ID (public, safe to ship). */
export const googleClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
export const googlePopupAvailable = socialAvailable && googleClientId.length > 0;

/**
 * A nonce ties Google's ID token to this one sign-in attempt. Google gets the
 * SHA-256 hash; Supabase gets the raw value and checks they match.
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

/** Exchanges a Google ID token for a Supabase session. Returns an error message or null. */
export async function signInWithGoogleIdToken(idToken: string, nonce: string): Promise<string | null> {
  if (!supabase) return 'The app is not connected to a database yet.';
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce });
  return error ? error.message : null;
}

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
