import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { SocialButtons } from '@/components/SocialButtons';
import { friendlyAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Log In',
    description:
      'Log in to your Independent Journey account to browse profiles, read messages and manage your surrogacy journey.',
    path: '/log-in',
  });
}

export default function LogIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // True when the account exists but its email was never confirmed, so we can
  // offer to send the confirmation link again.
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function submit() {
    if (!supabase) return setError('The app is not connected to a database yet.');
    setBusy(true);
    setError('');
    setUnconfirmed(false);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (err) {
      setUnconfirmed((err.message ?? '').toLowerCase().includes('email not confirmed'));
      return setError(friendlyAuthError(err.message));
    }
    router.replace('/welcome');
  }

  function resendConfirmation() {
    router.push({ pathname: '/verify-email', params: { email: email.trim().toLowerCase() } });
  }

  return (
    <Screen title="Welcome back" intro="Log in to your Independent Journey account.">
      {error ? <FormMessage kind="error" text={error} /> : null}
      {unconfirmed ? <Button label="Resend the confirmation email" variant="secondary" onPress={resendConfirmation} /> : null}
      <TextField label="Email" required value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label="Password" required value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <Button label={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />
      <SocialButtons />
      <Text style={styles.footer}>
        <Link href="/forgot-password" style={styles.link}>
          Forgot your password?
        </Link>
        {'  ·  '}
        <Link href="/verify-email" style={styles.link}>
          Didn’t get the confirmation email?
        </Link>
      </Text>
      <Text style={styles.footer}>
        New here?{' '}
        <Link href="/join" style={styles.link}>
          Create a free account
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
