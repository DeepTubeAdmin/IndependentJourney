import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { friendlyAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Verify your email');
}

/**
 * Shown right after sign-up, and reachable any time from the log-in page for
 * people who never got (or lost) the confirmation email. When we don't know
 * the email address, the person types it in.
 */
export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const knownEmail = Boolean(params.email);

  async function resend() {
    const address = email.trim().toLowerCase();
    if (!address.includes('@')) return setError('Enter the email address you signed up with.');
    if (!supabase) return setError('The app is not connected to a database yet.');
    setBusy(true);
    setError('');
    setSent(false);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: address });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err.message));
    setSent(true);
  }

  return (
    <Screen
      title={knownEmail ? 'Check your email' : 'Resend the confirmation email'}
      intro={
        knownEmail
          ? `We sent a confirmation link to ${params.email}. Click it to activate your account, then come back here to log in.`
          : 'Enter the email you signed up with and we will send the confirmation link again.'
      }
    >
      {error ? <FormMessage kind="error" text={error} /> : null}
      {sent ? <FormMessage kind="info" text={`Sent to ${email.trim().toLowerCase()}. Give it a minute, and check your spam or junk folder too. If it is already confirmed, just log in.`} /> : null}
      {knownEmail ? null : (
        <TextField label="Email" required value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" onSubmitEditing={resend} />
      )}
      <Button label={busy ? 'Sending…' : 'Resend the email'} variant="secondary" onPress={resend} disabled={busy} />
      <Text style={styles.footer}>
        Already confirmed?{' '}
        <Link href="/log-in" style={styles.link}>
          Log in
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
