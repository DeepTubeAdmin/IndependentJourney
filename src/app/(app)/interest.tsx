/** Interest received and sent, shown as limited previews. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '@/components/ProfileCard';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { browseProfiles, listInterests, markInterestSeen, type Interest, type PreviewRow } from '@/lib/browse';
import { colors, fonts, space } from '@/lib/theme';

export default function InterestPage() {
  const { session } = useSession();
  const [received, setReceived] = useState<(Interest & { who?: PreviewRow })[]>([]);
  const [sent, setSent] = useState<(Interest & { who?: PreviewRow })[]>([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { sent: s, received: r } = await listInterests(session.user.id);
      const attach = async (list: Interest[], key: 'from_id' | 'to_id') =>
        Promise.all(list.map(async (i) => ({ ...i, who: (await browseProfiles({ id: i[key] }, 1))[0] })));
      setReceived(await attach(r, 'from_id'));
      setSent(await attach(s, 'to_id'));
      markInterestSeen(r.filter((i) => !i.seen_at).map((i) => i.id));
    })();
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const Grid = ({ items, empty }: { items: (Interest & { who?: PreviewRow })[]; empty: string }) => (
    <View style={styles.grid}>
      {items.length === 0 ? <Text style={styles.note}>{empty}</Text> : null}
      {items.map((i) =>
        i.who ? (
          <ProfileCard key={i.id} name={i.who.display_name} state={i.who.state} role={i.who.role} verified={i.who.is_verified} headline={i.who.headline_tags.join(' · ') || 'Profile complete'} photoUrl={i.who.photo_url} onPress={() => router.push(`/profile/${i.who!.id}`)} />
        ) : null,
      )}
    </View>
  );

  return (
    <Screen width={1200} title="Interest" intro="People who are interested in you, and the people you've shown interest in.">
      <Text style={styles.h}>Interested in you</Text>
      <Grid items={received} empty="No one yet. Complete profiles and verified members get noticed most." />
      <Text style={styles.h}>You're interested in</Text>
      <Grid items={sent} empty="Browse profiles and tap “I'm interested” to let someone know." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, marginTop: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.textSubtle },
});
