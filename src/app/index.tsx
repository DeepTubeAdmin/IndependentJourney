/**
 * Homepage (Phase 2 placeholder).
 *
 * This is the "hello world" that proves the website deploys. In Phase 5 it
 * becomes the real homepage with large photo cards of verified, opted-in
 * surrogates and intended parents.
 */
import type { Metadata } from 'expo-router/server';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SITE } from '@/config/settings';
import { Disclaimer } from '@/components/Disclaimer';
import { colors, fonts, space } from '@/lib/theme';

export function generateMetadata(): Metadata {
  return {
    title: `${SITE.name}: independent surrogacy matching`,
    description:
      'A trust-focused place for intended parents and gestational surrogates to meet for an independent (non-agency) surrogacy journey. Launching soon.',
  };
}

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.inner}>
        <Text style={styles.wordmark} accessibilityRole="header">
          {SITE.name}
        </Text>

        <Text style={styles.headline} accessibilityRole="header" aria-level={1}>
          {SITE.tagline}
        </Text>

        <Text style={styles.lead}>
          A calm, trust-focused place for intended parents and gestational surrogates to find each
          other for an independent journey, without an agency in the middle.
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Launching soon</Text>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>For surrogates</Text>
            <Text style={styles.cardBody}>
              Always free. Build a profile, choose who can see it, and connect with intended parents
              who share your hopes for the journey.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>For intended parents</Text>
            <Text style={styles.cardBody}>
              Browse surrogate profiles, look for the Verified label, and start a conversation when
              you are ready.
            </Text>
          </View>
        </View>

        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: space.md,
    paddingVertical: space.xxl,
  },
  inner: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    gap: space.lg,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.primary,
  },
  headline: {
    fontFamily: fonts.heading,
    fontSize: 40,
    lineHeight: 48,
    color: colors.text,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textMuted,
    maxWidth: 640,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primaryText,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: 280,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: space.lg,
    gap: space.sm,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.text,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
