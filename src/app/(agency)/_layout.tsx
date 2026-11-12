/**
 * Agency area: must be signed in as an agency account. Members who land here
 * go to their own home.
 */
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function AgencyLayout() {
  const { loading, session, profile, agency, profileChecked } = useSession();
  if (loading || (session && !profileChecked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/log-in" />;
  if (profile) return <Redirect href="/home" />;
  if (!agency) return <Redirect href="/finish-sign-up" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
