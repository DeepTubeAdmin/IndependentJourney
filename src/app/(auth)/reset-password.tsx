/**
 * Landing page for the password reset link. Supabase signs the user in from
 * the link, then we let them choose a new password.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { friendlyAuthError, useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Reset password');
}

export default function ResetPassword() {
  const { session, loading } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) return;
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err.message));
    router.replace('/welcome');
  }

  if (!loading && !session) {
    return (
      <Screen title="This link has expired" intro="Password reset links only work once and for a short time. Request a new one and try again.">
        <Button label="Request a new link" onPress={() => router.replace('/forgot-password')} />
      </Screen>
    );
  }

  return (
    <Screen title="Choose a new password">
      {error ? <FormMessage kind="error" text={error} /> : null}
      <TextField label="New password" required help="At least 8 characters." value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Button label={busy ? 'Saving…' : 'Save password'} onPress={submit} disabled={busy} />
    </Screen>
  );
}
