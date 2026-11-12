/**
 * Onboarding is only for signed-in members. Anyone else goes to log in.
 */
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  const { loading, session, profile, agency, profileChecked } = useSession();
  if (loading || (session && !profileChecked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/log-in" />;
  // Agencies have no profile of their own but use the same messages, settings and (for clients) onboarding screens.
  if (!profile && !agency) return <Redirect href="/finish-sign-up" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
