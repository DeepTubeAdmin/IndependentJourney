import { Link, router } from 'expo-router';
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
  return privateMeta('Forgot password');
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  /** The reset email carries a code as well as a link. */
  async function useCode() {
    const token = code.replace(/\D/g, '');
    // Supabase lets the code length be set anywhere from 6 to 10 digits, so accept them all.
    if (token.length < 6 || token.length > 10) return setError('Type the whole code from the email (numbers only).');
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'recovery' });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err.message));
    router.replace('/reset-password');
  }

  async function submit() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/confirm` : undefined,
    });
    setBusy(false);
    // Always show the same message so nobody can probe which emails have accounts.
    setDone(true);
  }

  return (
    <Screen title="Reset your password" intro="Enter your email and we'll send you a link and a code to choose a new password.">
      {error ? <FormMessage kind="error" text={error} /> : null}
      {done ? <FormMessage kind="info" text="If there's an account for that email, a reset email is on its way. Click the button in it, or type the code below. Check your spam folder too." /> : null}
      <TextField label="Email" required value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!done} />
      {done ? (
        <>
          <TextField label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={12} onSubmitEditing={useCode} />
          <Button label={busy ? 'Checking…' : 'Continue with code'} onPress={useCode} disabled={busy} />
        </>
      ) : (
        <Button label={busy ? 'Sending…' : 'Send reset email'} onPress={submit} disabled={busy} />
      )}
      <Text style={styles.footer}>
        <Link href="/log-in" style={styles.link}>
          Back to log in
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
