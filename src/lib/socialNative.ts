/**
 * Google and Apple sign-in inside the phone apps.
 *
 * - Apple on an iPhone or iPad: Apple's own sign-in sheet (Face ID / Touch ID).
 *   Apple gives us an identity token, which Supabase turns into a session.
 * - Everything else (Google on any phone, Apple on Android): a secure in-app
 *   browser window opens the provider's sign-in page and hands the result
 *   straight back to the app. It is the system's sign-in browser, so saved
 *   Google accounts and passwords are available.
 *
 * The website never loads this file (see socialNative.web.ts).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type NativeSocialResult = { signedIn?: true; cancelled?: true; error?: string };

/** Where the provider sends people back to: the app itself. Must be allowed in Supabase (Auth, URL configuration). */
const APP_REDIRECT = 'independentjourney://welcome';

export async function nativeSocialSignIn(provider: 'google' | 'apple'): Promise<NativeSocialResult> {
  if (!supabase) return { error: 'The app is not connected to a database yet.' };
  if (provider === 'apple' && Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false))) {
    return appleSheet();
  }
  return browserSignIn(provider);
}

async function appleSheet(): Promise<NativeSocialResult> {
  try {
    // The nonce ties Apple's token to this one attempt: Apple gets the hash, Supabase checks the original.
    const raw = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '');
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!credential.identityToken) return { error: 'Apple did not complete the sign-in. Please try again.' };
    const { error } = await supabase!.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: raw });
    return error ? { error: error.message } : { signedIn: true };
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
    return { error: 'Apple sign-in did not work. Please try again, or use your email.' };
  }
}

async function browserSignIn(provider: 'google' | 'apple'): Promise<NativeSocialResult> {
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: APP_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error?.message ?? 'Sign-in could not be started.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, APP_REDIRECT);
  if (result.type !== 'success' || !result.url) return { cancelled: true };

  // The answer comes back in the address, after "#" or "?".
  const parts = result.url.split(/[#?]/).slice(1).join('&');
  const params = new URLSearchParams(parts);
  const problem = params.get('error_description') || params.get('error');
  if (problem) return { error: problem.replace(/\+/g, ' ') };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase!.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return sessionError ? { error: sessionError.message } : { signedIn: true };
  }
  const code = params.get('code');
  if (code) {
    const { error: codeError } = await supabase!.auth.exchangeCodeForSession(code);
    return codeError ? { error: codeError.message } : { signedIn: true };
  }
  return { error: 'Sign-in did not finish. Please try again.' };
}
