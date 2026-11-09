/**
 * Public share view: what a member chose to share by link. Search engines
 * are told not to index it. Only verified, complete profiles can be shared.
 */
import { useLocalSearchParams } from 'expo-router';
import type { Metadata } from 'expo-router/server';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Disclaimer } from '@/components/Disclaimer';
import { Screen } from '@/components/Screen';
import { loadShareView, prettyAnswers } from '@/lib/browse';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateMetadata(): Metadata {
  return { title: 'Shared profile', robots: 'noindex, nofollow' } as Metadata;
}

export default function ShareView() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [view, setView] = useState<Record<string, any> | null | undefined>(undefined);

  useEffect(() => {
    if (token) loadShareView(token).then(setView);
  }, [token]);

  if (view === undefined) return <Screen title="Loading…"><Text style={styles.note}>One moment.</Text></Screen>;
  if (!view) return <Screen title="This link is no longer active" intro="The member may have turned sharing off, or the link was typed incorrectly."><Disclaimer /></Screen>;

  return (
    <Screen width={880} title={`${view.display_name} · ${view.state}`} intro={`${view.role === 'surrogate' ? 'Gestational surrogate' : 'Intended parent'} · Identity verified · Shared by the member`}>
      <View style={styles.photos}>
        {(view.photoUrls as string[]).map((u, i) => (
          <Image key={i} source={{ uri: u }} style={styles.photo} accessibilityLabel={`Photo ${i + 1}`} />
        ))}
      </View>
      <View style={styles.tags}>
        {(view.headline_tags as string[]).map((t) => (
          <Text key={t} style={styles.tag}>{t}</Text>
        ))}
      </View>
      <Text style={styles.bio}>{view.bio}</Text>
      {(view.parents ?? []).length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The family</Text>
          {view.parents.map((p: any, i: number) => (
            <Text key={i} style={styles.rowValue}>{p.first_name}{p.age ? `, ${p.age}` : ''}</Text>
          ))}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About the journey</Text>
        {prettyAnswers(view.surrogate ?? view.ip, ['compensation_min_usd', 'compensation_max_usd', 'clinic_name']).map((r) => (
          <View key={r.label} style={styles.row}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: 260, height: 320, borderRadius: radius.lg, backgroundColor: colors.surfaceSoft, flexGrow: 1, maxWidth: 420 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.secondary, backgroundColor: colors.surfaceSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  bio: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: space.xs },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', paddingVertical: 4 },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSubtle, minWidth: 220 },
  rowValue: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1, minWidth: 160 },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
});
