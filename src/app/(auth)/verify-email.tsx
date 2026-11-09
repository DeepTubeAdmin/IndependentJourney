import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [sent, setSent] = useState(false);

  async function resend() {
    if (!supabase || !email) return;
    await supabase.auth.resend({ type: 'signup', email });
    setSent(true);
  }

  return (
    <Screen title="Check your email" intro={`We sent a confirmation link to ${email ?? 'your email address'}. Click it to activate your account, then come back here to log in.`}>
      {sent ? <FormMessage kind="info" text="Sent again. Give it a minute and check your spam folder too." /> : null}
      <Button label="Resend the email" variant="secondary" onPress={resend} />
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
