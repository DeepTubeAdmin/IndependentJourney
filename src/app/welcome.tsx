/**
 * Where people land after logging in or confirming their email.
 * Sends them to onboarding until their profile is complete, then to the app.
 */
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Welcome() {
  const { loading, session, profile } = useSession();
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
