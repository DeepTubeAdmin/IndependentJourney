/**
 * "Me": the account menu as a full screen. In the phone apps this is the
 * last tab; on the website the same links live in the header's account menu,
 * and this page works there too.
 */
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import { privateMeta } from '@/lib/seo';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Me');
}

type Item = { label: string; help?: string; onPress: () => void; danger?: boolean };

export default function Me() {
  const { session, profile, agency, signOut } = useSession();
  if (!session) return null;
  const isAgency = Boolean(agency) && !profile;
  const go = (href: string) => () => router.push(href as never);

  const account: Item[] = isAgency
    ? [
        { label: 'Agency dashboard', help: 'Your agency details and client profiles', onPress: go('/agency') },
        { label: 'Settings', help: 'Email, password, notifications, blocked members, delete account', onPress: go('/settings') },
      ]
    : [
        { label: 'My profile', help: 'See your profile as others see it, and share it', onPress: go('/my-profile') },
        { label: 'Edit profile', help: 'Change your answers, story and photos', onPress: go('/onboarding/review') },
        { label: 'Settings', help: 'Email, password, notifications, blocked members, delete account', onPress: go('/settings') },
      ];
  const help: Item[] = [
    { label: 'How it works', onPress: go('/how-it-works') },
    { label: 'Resources', onPress: go('/resources') },
    { label: 'Contact support', help: SITE.supportEmail, onPress: () => Linking.openURL(`mailto:${SITE.supportEmail}`) },
  ];
  const legal: Item[] = [
    { label: 'Terms', onPress: go('/terms') },
    { label: 'Privacy policy', onPress: go('/privacy') },
    { label: 'Disclaimer', onPress: go('/disclaimer') },
  ];

  return (
    <Screen width={640} title={profile?.display_name || agency?.name || 'Your account'} intro={session.user.email ?? undefined}>
      <Group title="Account" items={account} />
      <Group title="Help" items={help} />
      <Group title="Legal" items={legal} />
      <Group items={[{ label: 'Sign out', danger: true, onPress: async () => { await signOut(); router.replace('/'); } }]} />
    </Screen>
  );
}

function Group({ title, items }: { title?: string; items: Item[] }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={it.onPress} accessibilityRole="button" style={({ pressed }) => [styles.item, i > 0 && styles.divider, pressed && styles.pressed]}>
            <View style={styles.itemText}>
              <Text style={[styles.label, it.danger && styles.danger]}>{it.label}</Text>
              {it.help ? <Text style={styles.help}>{it.help}</Text> : null}
            </View>
            {it.danger ? null : <Text style={styles.chevron}>›</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.xs },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space.xs },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 14, minHeight: 52 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  help: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  chevron: { fontSize: 22, color: colors.textSubtle },
  danger: { color: colors.danger },
  pressed: { opacity: 0.7 },
});
