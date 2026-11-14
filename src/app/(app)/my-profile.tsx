/**
 * "My profile" in the account menu. Members copy whatever is in the browser
 * bar when they want to show someone their profile, so this screen sends
 * them to the address that actually works for outsiders: their share link
 * (/s/<code>), creating it if needed. Members who cannot have a share link
 * yet (not verified or not complete) see their own normal profile page,
 * which tells them why.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { createShareLink, getShareLink } from '@/lib/browse';
import { privateMeta } from '@/lib/seo';
import { colors } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('My profile');
}

export default function MyProfile() {
  const { profile, agency } = useSession();

  useEffect(() => {
    if (!profile) {
      if (agency) router.replace('/agency');
      return;
    }
    (async () => {
      let token = await getShareLink(profile.id);
      if (!token && profile.is_verified && profile.is_complete) token = (await createShareLink()).token ?? null;
      router.replace(token ? `/s/${token}` : `/profile/${profile.id}`);
    })();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
