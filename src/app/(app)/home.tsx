/**
 * Member home: profile status, quick links, sign out.
 * Browsing and messaging arrive in later phases.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { admin } from '@/lib/admin';
import { useSession } from '@/lib/auth';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function Home() {
  const { profile, signOut } = useSession();
  // Only people on the admin list see the Admin button.
  const [isAdminCandidate, setIsAdminCandidate] = useState(false);
  useEffect(() => {
    admin.amICandidate().then((r) => setIsAdminCandidate(Boolean(r.data)));
  }, []);
  if (!profile) return null;
  const isSurrogate = profile.role === 'surrogate';
  const name = profile.display_name || (isSurrogate ? 'there' : 'intended parents');

  return (
    <Screen title={`Welcome, ${name}`} intro={isSurrogate ? 'Thank you for being here. Your profile is free, always.' : 'Your account is ready. Browsing surrogate profiles opens in the next update.'}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your profile</Text>
        <Text style={styles.status}>
          {profile.is_complete ? 'Complete and visible to members' : 'Not finished yet: it stays hidden until every required question is answered and 3 photos are added.'}
        </Text>
        <Text style={styles.status}>{profile.is_verified ? 'Identity: Verified' : 'Identity: Not verified (free optional verification coming soon)'}</Text>
        <Button label={profile.is_complete ? 'Edit my profile' : 'Finish my profile'} onPress={() => router.push(profile.is_complete ? '/onboarding/review' : '/onboarding/0')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isSurrogate ? 'Intended parents who message you' : 'Browse surrogates'}</Text>
        <FormMessage kind="info" text={isSurrogate ? 'Messaging arrives in a later update. Verified intended parents with a membership will be able to reach out to you here.' : 'Browsing and membership open in a later update. You will see limited previews for free and full profiles with a membership.'} />
      </View>

      {isAdminCandidate ? <Button label="Admin dashboard" variant="secondary" onPress={() => router.push('/admin')} /> : null}
      <Button label="Sign out" variant="secondary" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  status: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
