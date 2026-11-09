/**
 * Gate for the admin area:
 *   1. must be signed in,
 *   2. must be on the admin list (admin_roles table),
 *   3. must have confirmed an authenticator-app code this session (2FA).
 * Until step 3 is done, the only thing shown is the 2FA screen.
 */
import { Redirect, router, Stack, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { TwoFactorGate } from '@/components/admin/TwoFactorGate';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { admin, mfa } from '@/lib/admin';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function AdminLayout() {
  const { loading, session } = useSession();
  const path = usePathname();
  const [state, setState] = useState<{ checked: boolean; candidate: boolean; aal2: boolean }>({ checked: false, candidate: false, aal2: false });

  const check = useCallback(async () => {
    if (!session) return;
    const [{ data: candidate }, s] = await Promise.all([admin.amICandidate(), mfa.status()]);
    setState({ checked: true, candidate: Boolean(candidate), aal2: s.aal === 'aal2' });
  }, [session]);

  useEffect(() => {
    check();
    // Re-check when the session changes (for example right after a 2FA code is confirmed).
    const sub = supabase?.auth.onAuthStateChange(() => check());
    return () => sub?.data.subscription.unsubscribe();
  }, [check]);

  if (loading || (session && !state.checked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/log-in" />;
  if (!state.candidate) {
    return (
      <Screen title="Not an admin" intro="This account is not on the admin list.">
        <Button label="Back to my account" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }
  // The security page manages 2FA itself, so it is allowed through at aal1.
  if (!state.aal2 && path !== '/admin/security') return <TwoFactorGate onDone={check} />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
