/**
 * Membership (intended parents) and identity verification (everyone), both
 * handled by Stripe. The browser never talks to Stripe directly: it asks our
 * Edge Functions for a Stripe page URL and sends the member there. Stripe
 * then tells our server the result, and these helpers read it back.
 */
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type MembershipStatus = 'none' | 'active' | 'lapsed' | 'cancelled';

export type Membership = {
  status: MembershipStatus;
  active: boolean;
  /** Migration 38: everything is free, so nobody needs a membership. */
  free?: boolean;
  current_period_end: string | null;
  source: 'manual' | 'stripe' | 'revenuecat' | null;
  price_usd: number;
  term_months: number;
};

export type IdentityCheck = {
  id: string;
  status: 'created' | 'processing' | 'verified' | 'requires_input' | 'canceled';
  last_error: string | null;
  created_at: string;
};

/** The signed-in member's membership plus the live price and term. */
export async function myMembership(): Promise<Membership | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('my_membership');
  return (data as Membership) ?? null;
}

/** The member's latest ID check, or null if they never started one. */
export async function myIdentityCheck(): Promise<IdentityCheck | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('my_identity_check');
  return (data as IdentityCheck) ?? null;
}

/** Asks an Edge Function for a Stripe URL and opens it. */
async function openStripePage(fn: 'create-checkout' | 'create-verification'): Promise<{ error?: string; closed?: true }> {
  // Apple and Google require in-app purchases for memberships bought inside
  // the apps, so card checkout is never opened from there.
  if (fn === 'create-checkout' && Platform.OS !== 'web') return { error: 'Memberships cannot be bought in the app yet.' };
  if (!supabase) return { error: 'Not connected to the database.' };
  const { data, error } = await supabase.functions.invoke(fn);
  if (error) {
    // The function sends a friendly message in its JSON body when it can.
    let text = 'Something went wrong. Please try again.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) text = body.error;
    } catch {
      /* keep the default message */
    }
    return { error: text };
  }
  const url = (data as { url?: string; error?: string } | null)?.url;
  if (!url) return { error: (data as { error?: string } | null)?.error ?? 'No checkout link was returned.' };
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return {};
  }
  // Phone apps: a secure browser sheet slides up over the app. `closed` tells
  // the caller the member is back, so it can re-check the result.
  await WebBrowser.openBrowserAsync(url);
  return { closed: true };
}

export const startCheckout = () => openStripePage('create-checkout');
export const startVerification = () => openStripePage('create-verification');

/** "$199" style, from the live setting. */
export const formatUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** "March 4, 2027" style for the end of a term. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Plain-English line about the member's verification state. */
export function identityLine(isVerified: boolean, check: IdentityCheck | null): string {
  if (isVerified) return 'Identity: Verified';
  if (!check) return 'Identity: Not verified. Verification is free and takes about two minutes with a photo ID.';
  switch (check.status) {
    case 'processing':
      return 'Identity: Checking your documents now. This usually takes a few minutes.';
    case 'requires_input':
      return 'Identity: We could not confirm your ID. You can try again with a clearer photo.';
    case 'canceled':
      return 'Identity: Verification was cancelled. You can start again any time.';
    default:
      return 'Identity: Not verified. Verification is free and takes about two minutes with a photo ID.';
  }
}
