/**
 * Landing page for the links in our login emails (confirm sign-up, password
 * reset, email change, magic link).
 *
 * The emails used to link straight to Supabase (a long supabase.co address),
 * which spam filters dislike and which some mail scanners "click" before the
 * person does, using up the one-time link. Now the email links to
 *   https://independentjourney.com/confirm?token_hash=...&type=signup
 * and this page exchanges that token for a session with verifyOtp(). The
 * exchange only happens when the page runs in a real browser, so a scanner
 * fetching the link does not burn it.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { EmailOtpType } from '@supabase/supabase-js';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { friendlyAuthError } from '@/lib/auth';
import { privateMeta } from '@/lib/seo';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Confirming');
}

const TYPES: EmailOtpType[] = ['signup', 'recovery', 'email_change', 'magiclink', 'invite', 'email'];

/** Where each kind of link goes once the token is accepted. */
function destination(type: EmailOtpType): string {
  if (type === 'recovery') return '/reset-password';
  if (type === 'email_change') return '/settings';
  return '/welcome';
}

export default function Confirm() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [error, setError] = useState('');
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : '';
  const type = (TYPES as string[]).includes(params.type ?? '') ? (params.type as EmailOtpType) : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) return setError('The app is not connected yet. Please try again in a moment.');
      if (!tokenHash || !type) return setError('This link is incomplete. Please open the newest email we sent you, or request a new one.');
      const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!alive) return;
      if (err) return setError(friendlyAuthError(err.message));
      router.replace(destination(type));
    })();
    return () => {
      alive = false;
    };
  }, [tokenHash, type]);

  if (error) {
    const recovery = type === 'recovery';
    return (
      <Screen title={recovery ? 'This reset link did not work' : 'This link did not work'} intro={`${error} Links work once and expire after an hour. You can also type the code from the same email instead.`}>
        <Button label={recovery ? 'Request a new reset email' : 'Get a new confirmation email'} onPress={() => router.replace(recovery ? '/forgot-password' : '/verify-email')} />
        <Button label="Go to log in" variant="secondary" onPress={() => router.replace('/log-in')} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
