/**
 * Where people land after logging in or confirming their email.
 * Sends them to onboarding until their profile is complete, then to the app.
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { privateMeta } from '@/lib/seo';
import { completeSignup, readPendingSignup } from '@/lib/social';
import { colors } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Welcome');
}

export default function Welcome() {
  const { loading, session, profile, profileChecked, refreshProfile } = useSession();
  // Signed in but no profile: a Google/Apple sign-up. If they already picked a
  // role and agreed on the sign-up page, finish quietly; otherwise ask.
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    if (loading || !session || !profileChecked || profile || finishing) return;
    setFinishing(true);
    readPendingSignup().then(async (p) => {
      if (p?.agreed && p.role) {
        const err = await completeSignup(p.role, p.legal_version);
        if (!err) {
          await refreshProfile();
          router.replace('/onboarding/0');
          return;
        }
      }
      router.replace('/finish-sign-up');
    });
  }, [loading, session, profileChecked, profile, finishing, refreshProfile]);

  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/log-in" />;
  if (!profile?.is_complete) return <Redirect href="/onboarding/0" />;
  return <Redirect href="/home" />;
}
