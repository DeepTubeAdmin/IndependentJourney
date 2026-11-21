import { Link, router, useLocalSearchParams } from 'expo-router';
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
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const knownEmail = Boolean(params.email);

  /** The email also carries a code, for people whose mail app will not open the link. */
  async function confirmWithCode() {
    const address = email.trim().toLowerCase();
    const token = code.replace(/\D/g, '');
    if (!address.includes('@')) return setError('Enter the email address you signed up with.');
    // Supabase lets the code length be set anywhere from 6 to 10 digits, so accept them all.
    if (token.length < 6 || token.length > 10) return setError('Type the whole code from the email (numbers only).');
    if (!supabase) return setError('The app is not connected to a database yet.');
    setChecking(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: address, token, type: 'signup' });
    setChecking(false);
    if (err) return setError(friendlyAuthError(err.message));
    router.replace('/welcome');
  }

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
          ? `We sent an email to ${params.email}. Click the button in it, or type the code from the email below. Check your spam or junk folder if it has not arrived in a minute.`
          : 'Enter the email you signed up with. Type the code if you have the email, or we can send it again.'
      }
    >
      {error ? <FormMessage kind="error" text={error} /> : null}
      {sent ? <FormMessage kind="info" text={`Sent to ${email.trim().toLowerCase()}. Give it a minute, and check your spam or junk folder too. If it is already confirmed, just log in.`} /> : null}
      {knownEmail ? null : (
        <TextField label="Email" required value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      )}
      <TextField label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={12} onSubmitEditing={confirmWithCode} />
      <Button label={checking ? 'Checking…' : 'Confirm with code'} onPress={confirmWithCode} disabled={checking || busy} />
      <Button label={busy ? 'Sending…' : 'Send the email again'} variant="secondary" onPress={resend} disabled={busy || checking} />
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
