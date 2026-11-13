/**
 * Where people land after logging in or confirming their email.
 * Brand-new profiles go to onboarding; everyone else goes to Home.
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { privateMeta } from '@/lib/seo';
import { completeAgencySignup, completeSignup, readPendingSignup } from '@/lib/social';
import { colors } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Welcome');
}

export default function Welcome() {
  const { loading, session, profile, agency, profileChecked, refreshProfile } = useSession();
  // Signed in but no profile: a Google/Apple sign-up. If they already picked a
  // role and agreed on the sign-up page, finish quietly; otherwise ask.
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    if (loading || !session || !profileChecked || profile || finishing) return;
    // An agency login has no profile: its home is the agency dashboard.
    if (agency) { router.replace('/agency'); return; }
    setFinishing(true);
    readPendingSignup().then(async (p) => {
      if (p?.agreed && p.role === 'agency') {
        const err = await completeAgencySignup(p.agency_name ?? '', p.agency_website ?? '', p.contact_name ?? '', p.legal_version);
        if (!err) {
          await refreshProfile();
          router.replace('/agency');
          return;
        }
      } else if (p?.agreed && p.role && p.role !== 'agency') {
        const err = await completeSignup(p.role, p.legal_version);
        if (!err) {
          await refreshProfile();
          router.replace('/onboarding/0');
          return;
        }
      }
      router.replace('/finish-sign-up');
    });
  }, [loading, session, agency, profileChecked, profile, finishing, refreshProfile]);

  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/log-in" />;
  // Brand-new profile (nothing answered yet): straight into the questionnaire.
  // Anyone else lands on Home, which shows "Finish my profile" when needed.
  if (profile && !profile.is_complete && !profile.display_name) return <Redirect href="/onboarding/0" />;
  return <Redirect href="/home" />;
}
