/**
 * Homepage (Phase 2 placeholder, styled in the "Linen & Sky" direction).
 *
 * The profile row shows clearly labelled example cards so the layout can be
 * reviewed. In Phase 5 it is replaced by real, opted-in, verified members.
 */
import type { Metadata } from "expo-router/server";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { ProfileCard, type ProfileCardProps } from "@/components/ProfileCard";
import { SITE } from "@/config/settings";
import { colors, fonts, radius, space } from "@/lib/theme";

export function generateMetadata(): Metadata {
  return {
    title: `${SITE.name}: independent surrogacy matching`,
    description:
      "A calm place for intended parents and gestational surrogates to find each other and plan an independent (non-agency) journey. Launching soon.",
  };
}

const EXAMPLE_PROFILES: ProfileCardProps[] = [
  {
    name: "Megan, 31",
    state: "Texas",
    role: "surrogate",
    verified: true,
    headline: "2 prior births · Open to twins · Ready spring 2027",
    example: true,
  },
  {
    name: "Daniel & Luis",
    state: "Colorado",
    role: "intended_parents",
    verified: true,
    headline: "Embryos ready · First child · Hoping to start this year",
    example: true,
  },
  {
    name: "Aisha, 28",
    state: "Georgia",
    role: "surrogate",
    verified: false,
    headline: "1 prior birth · Regular updates · Open to all family types",
    example: true,
  },
  {
    name: "Priya",
    state: "New Jersey",
    role: "intended_parent",
    verified: true,
    headline: "Single mom by choice · Attorney consulted · Close relationship",
    example: true,
  },
];

const TRUST_POINTS = [
  "Optional photo ID verification",
  "Phone and email checks on every account",
  "Safety team reviews messages",
  "No match or outcome fees, ever",
];

const STEPS = [
  [
    "Create a free profile",
    "Share your story, photos and what matters most to you. You choose who can see it.",
  ],
  [
    "Browse and connect",
    "Look for the Verified label, express interest and start a conversation.",
  ],
  [
    "Take it from here",
    "Once you've met, you work with your own clinic and attorney. We stay out of the way.",
  ],
];

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <View style={styles.mark}>
              <View style={styles.markDot} />
            </View>
            <Text style={styles.wordmark}>{SITE.name}</Text>
          </View>
          <Button label="Join free" size="sm" />
        </View>

        <View style={styles.hero}>
          <Text
            style={styles.headline}
            accessibilityRole="header"
            aria-level={1}
          >
            Your journey, your match,{" "}
            <Text style={styles.headlineAccent}>your terms.</Text>
          </Text>
          <Text style={styles.lead}>
            A calm place for intended parents and gestational surrogates to find
            each other and plan an independent journey together. No agency, no
            match fees. Surrogates always join free.
          </Text>
          <View style={styles.ctaRow}>
            <Button label="I'm a surrogate" />
            <Button label="We're intended parents" variant="secondary" />
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>
              Launching soon · sign-up opens shortly
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.h2} accessibilityRole="header" aria-level={2}>
            Browsing right now
          </Text>
          <Text style={styles.sectionNote}>
            Example cards. Real verified members who opt in will appear here.
            Swipe to see more.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
          style={styles.cardScroller}
        >
          {EXAMPLE_PROFILES.map((p) => (
            <ProfileCard key={p.name} {...p} />
          ))}
        </ScrollView>

        <View style={styles.trust}>
          <Text style={styles.trustTitle}>Built for trust, not fees</Text>
          {TRUST_POINTS.map((t) => (
            <Text key={t} style={styles.trustItem}>
              {t}
            </Text>
          ))}
        </View>

        <View style={styles.steps}>
          {STEPS.map(([title, body], i) => (
            <View key={title} style={styles.step}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{body}</Text>
            </View>
          ))}
        </View>

        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const MAX_WIDTH = 1180;

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingBottom: space.xl,
  },
  inner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
  },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  mark: {
    width: 26,
    height: 26,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  markDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginBottom: 3,
  },
  wordmark: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  hero: { paddingTop: space.lg, gap: space.md, maxWidth: 720 },
  headline: {
    fontFamily: fonts.heading,
    fontSize: 40,
    lineHeight: 46,
    color: colors.text,
  },
  headlineAccent: { fontFamily: fonts.headingItalic, color: colors.primary },
  lead: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textMuted,
  },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  soonPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  soonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.secondary,
  },
  sectionHead: { paddingTop: space.xl, paddingBottom: space.sm, gap: 4 },
  h2: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  sectionNote: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSubtle,
  },
  cardScroller: { flexGrow: 0 },
  cardRow: { gap: space.md, paddingVertical: space.sm, paddingRight: space.md },
  trust: {
    marginTop: space.lg,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    columnGap: space.lg,
    alignItems: "center",
  },
  trustTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  trustItem: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  steps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
    paddingVertical: space.xl,
  },
  step: { flexGrow: 1, flexBasis: 260, gap: 6 },
  stepNumber: { fontFamily: fonts.heading, fontSize: 32, color: colors.accent },
  stepTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  stepBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
  },
});
