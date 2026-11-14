/**
 * Public share view: what a member chose to share by link. Search engines
 * are told not to index it. Only verified, complete profiles can be shared.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Disclaimer } from '@/components/Disclaimer';
import { Screen } from '@/components/Screen';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import { compensationLine, loadShareView, prettyAnswers, revokeShareLink } from '@/lib/browse';
import { privateMeta } from '@/lib/seo';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Shared profile');
}

export default function ShareView() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  const [view, setView] = useState<Record<string, any> | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) loadShareView(token).then(setView);
  }, [token]);

  const isOwner = Boolean(view && session && session.user.id === view.id);
  const link = `${SITE.url}/s/${token}`;

  // Copy the link, or open the phone's share sheet where there is one.
  async function share() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: `${view?.display_name} on ${SITE.name}`, url: link });
        return;
      }
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* the link is shown as text below, so the member can still copy it by hand */
    }
  }

  async function turnOff() {
    if (!session) return;
    await revokeShareLink(session.user.id);
    router.replace('/home');
  }

  if (view === undefined) return <Screen title="Loading…"><Text style={styles.note}>One moment.</Text></Screen>;
  if (!view) return <Screen title="This link is no longer active" intro="The member may have turned sharing off, or the link was typed incorrectly."><Disclaimer /></Screen>;

  return (
    <Screen width={880} title={`${view.display_name} · ${view.state}`} intro={`${view.role === 'surrogate' ? 'Gestational surrogate' : 'Intended parent'} · Identity verified · Shared by the member`}>
      {isOwner ? (
        <View style={styles.ownerBox}>
          <Text style={styles.ownerTitle}>This is your shareable profile link</Text>
          <Text style={styles.ownerText}>
            Copy the address above or use the button below. Anyone with this link sees your full profile, even without an account. You can turn it off at any time; the normal address people find on the site shows only a preview.
          </Text>
          <Text selectable style={styles.ownerLink}>{link}</Text>
          <View style={styles.ownerRow}>
            <Button label={copied ? 'Copied' : 'Copy or share link'} size="sm" onPress={share} />
            <Button label="Edit profile" variant="secondary" size="sm" onPress={() => router.push('/home')} />
            <Button label="Turn off this link" variant="secondary" size="sm" onPress={turnOff} />
          </View>
        </View>
      ) : null}
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
        {view.surrogate && compensationLine(view.surrogate) ? (
          <View style={styles.row}><Text style={styles.rowLabel}>Compensation</Text><Text style={styles.rowValue}>{compensationLine(view.surrogate)}</Text></View>
        ) : null}
        {prettyAnswers(view.surrogate ?? view.ip, ['compensation_min_usd', 'compensation_max_usd', 'compensation_open', 'clinic_name']).map((r) => (
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
  ownerBox: { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.secondaryBorder, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  ownerTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  ownerText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  ownerLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.secondary },
  ownerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
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
