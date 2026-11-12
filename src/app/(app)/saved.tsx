/** Profiles the member saved to come back to. Private to them. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '@/components/ProfileCard';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { browseProfiles, listSavedIds, verifiedLabel, type PreviewRow } from '@/lib/browse';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Saved profiles');
}

export default function SavedPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<PreviewRow[] | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const ids = await listSavedIds(session.user.id);
      const found = await Promise.all(ids.map((id) => browseProfiles({ id }, 1).then((r) => r[0])));
      setRows(found.filter(Boolean));
    })();
  }, [session?.user.id]);

  return (
    <Screen width={1200} title="Saved profiles" intro="Only you can see this list. Open a profile to send a message when you're ready.">
      {rows === null ? <Text style={styles.note}>Loading…</Text> : null}
      {rows && rows.length === 0 ? <Text style={styles.note}>Nothing saved yet. While browsing, tap “Save profile” to keep someone here.</Text> : null}
      <View style={styles.grid}>
        {(rows ?? []).map((p) => (
          <ProfileCard key={p.id} name={p.display_name} state={p.state} role={p.role} verified={verifiedLabel(p)} headline={p.headline_tags.join(' · ') || 'Profile complete'} photoUrl={p.photo_url} onPress={() => router.push(`/profile/${p.id}`)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.textSubtle },
});
