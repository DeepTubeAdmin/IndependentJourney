/**
 * Step 0 of sign-up: choose a role. Every account type is free.
 */
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, fonts, radius, space } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Join Free',
    description:
      'Create a free Independent Journey profile. Free for surrogates, intended parents and agencies: full profiles, messaging and identity verification, with no match fees.',
    path: '/join',
  });
}

export default function Join() {
  return (
    <Screen title="Join Independent Journey" intro="Tell us who you are so we can set up the right account. You can't change this later, so pick carefully.">
      <RoleCard
        title="I'm a surrogate"
        body="Free. Build a profile and connect with intended parents on your terms. You must be 21 or older."
        onPress={() => router.push({ pathname: '/sign-up', params: { role: 'surrogate' } })}
      />
      <RoleCard
        title="We're intended parents"
        body="Free. Build a profile, read full surrogate profiles and message the ones who feel right. You must be 18 or older."
        onPress={() => router.push({ pathname: '/sign-up', params: { role: 'intended_parent' } })}
      />
      <RoleCard
        title="We're an agency"
        body="Post and manage profiles for the surrogates and intended parents you represent, clearly labelled as your clients. Free."
        onPress={() => router.push({ pathname: '/sign-up', params: { role: 'agency' } })}
      />
      <Text style={styles.footer}>
        Already have an account?{' '}
        <Link href="/log-in" style={styles.link}>
          Log in
        </Link>
      </Text>
    </Screen>
  );
}

function RoleCard({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { borderColor: colors.primary }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <Text style={styles.cardCta}>Continue →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  cardBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  cardCta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary, marginTop: 4 },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
});
