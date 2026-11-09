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
import { createShareLink, getShareLink, revokeShareLink } from '@/lib/browse';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function Home() {
  const { profile, signOut } = useSession();
  // Only people on the admin list see the Admin button.
  const [isAdminCandidate, setIsAdminCandidate] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  useEffect(() => {
    admin.amICandidate().then((r) => setIsAdminCandidate(Boolean(r.data)));
    if (profile) getShareLink(profile.id).then(setShareToken);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <Text style={styles.cardTitle}>{isSurrogate ? 'Intended parents' : 'Surrogates'}</Text>
        <Text style={styles.status}>
          {isSurrogate
            ? 'Read full intended-parent profiles any time. Complete your own profile to start conversations (messaging arrives in the next update).'
            : 'Browse limited previews for free. A membership unlocks full profiles and messaging (opening in a coming update).'}
        </Text>
        <View style={styles.row}>
          <Button label="Browse" onPress={() => router.push('/browse')} />
          <Button label="Interest" variant="secondary" onPress={() => router.push('/interest')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Share your profile</Text>
        <Text style={styles.status}>
          {profile.is_verified && profile.is_complete
            ? 'Create a private link to show your profile to someone off the platform, like your attorney or family. You can turn it off any time.'
            : 'Share links unlock once your profile is complete and verified.'}
        </Text>
        {shareMsg ? <FormMessage kind="info" text={shareMsg} /> : null}
        {shareToken ? (
          <>
            <Text selectable style={styles.link}>{`${SITE.url}/s/${shareToken}`}</Text>
            <Button label="Turn off this link" variant="secondary" size="sm" onPress={async () => { await revokeShareLink(profile.id); setShareToken(null); setShareMsg('Link turned off. Anyone who had it now sees nothing.'); }} />
          </>
        ) : (
          <Button
            label="Create share link"
            variant="secondary"
            size="sm"
            disabled={!(profile.is_verified && profile.is_complete)}
            onPress={async () => {
              const r = await createShareLink();
              if (r.error) return setShareMsg(r.error);
              setShareToken(r.token ?? null);
              setShareMsg('');
            }}
          />
        )}
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
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.secondary },
});
