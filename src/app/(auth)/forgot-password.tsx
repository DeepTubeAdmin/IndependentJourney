import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
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

  async function submit() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    setBusy(false);
    // Always show the same message so nobody can probe which emails have accounts.
    setDone(true);
  }

  return (
    <Screen title="Reset your password" intro="Enter your email and we'll send you a link to choose a new password.">
      {done ? <FormMessage kind="info" text="If there's an account for that email, a reset link is on its way. Check your spam folder too." /> : null}
      <TextField label="Email" required value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Button label={busy ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={busy || done} />
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
