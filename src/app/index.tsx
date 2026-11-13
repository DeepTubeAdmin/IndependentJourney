/**
 * Homepage, styled in the "Linen & Sky" direction.
 *
 * The profile row shows real members (both roles). While they load it shows
 * blank placeholder cards, never sample content.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfileCard } from "@/components/ProfileCard";
import { featuredProfiles, profileTypeLabel, verifiedLabel, type PreviewRow } from "@/lib/browse";
import { SITE } from "@/config/settings";
import { pageMeta } from "@/lib/seo";
import { colors, fonts, radius, space } from "@/lib/theme";

export function generateMetadata() {
  return pageMeta({
    title: `${SITE.name}: Find a Surrogate or Intended Parents, Independent or With an Agency`,
    description:
      "One place for intended parents and gestational surrogates to find each other: independent members and agency-represented clients, clearly labelled. Create a free profile, browse verified members and message directly. No match fees.",
    path: "/",
  });
}

const TRUST_POINTS = [
  "Optional photo ID verification",
  "Phone and email checks on every account",
  "Safety team reviews messages",
  "No match or outcome fees, ever",
  "Independent and agency profiles clearly labelled",
];

// Short answers to the questions people type into search engines. Plain
// language, no advice: it describes the site and the process only.
const FAQ: [string, string][] = [
  [
    "What is independent surrogacy?",
    "Independent (or \"indy\") surrogacy is when intended parents and a gestational surrogate find each other and coordinate the journey themselves, with a fertility clinic for the medical side and a reproductive attorney for each side, instead of paying an agency to match and manage them.",
  ],
  [
    "Is Independent Journey a surrogacy agency?",
    "No. We are an introduction platform. We never match, screen medically, hold money or give legal or medical advice. Once you have met someone here, your clinic and attorneys take it from there.",
  ],
  [
    "What does the Independent or Agency label mean?",
    "Every profile says who is behind it. Independent means the member posted it themselves. Agency means a surrogacy agency posted it for a client they represent, with the agency's name shown; messages to that profile go to the agency. Some independent members also note that they are working with an agency.",
  ],
  [
    "Can agencies use Independent Journey?",
    "Yes. Agencies apply for an account, we approve each one by hand, and they can then post profiles for the surrogates and intended parents they represent, using the same questionnaire as everyone else. Members choose whether agencies may message them.",
  ],
  [
    "How much does it cost?",
    "Surrogates always join free. Intended parents browse limited previews free, and a simple membership unlocks full profiles and messaging. There are no match fees and no fees tied to a pregnancy or birth.",
  ],
  [
    "How do I know a profile is real?",
    "Every profile is labelled Verified or Not verified. Verification is a free photo-ID and selfie check by Stripe Identity. We also scan messages for scam patterns, let you block and report anyone, and remind everyone: never send money to someone you meet here.",
  ],
  [
    "Which states does it cover?",
    "Independent Journey is for people in the United States. Surrogacy law differs by state, so always talk to a reproductive attorney licensed where the surrogate lives and where the baby would be born.",
  ],
  [
    "Can surrogates message intended parents directly?",
    "Yes. Once a surrogate's profile is complete she can write to any intended parent for free. Intended parents read and reply with an active membership.",
  ],
];

const STEPS = [
  [
    "Create a free profile",
    "Share your story, photos and what matters most to you. You choose who can see it.",
  ],
  [
    "Browse and connect",
    "Look for the Verified label, save profiles you like and send a message when you are ready.",
  ],
  [
    "Take it from here",
    "Once you've met, you work with your own clinic and attorney. We stay out of the way.",
  ],
];

export default function Home() {
  // Real members from both sides (Seth's rule: the homepage shows surrogates
  // and intended parents to everyone; Browse narrows to the other side).
  const [featured, setFeatured] = useState<PreviewRow[]>([]);
  // True until the first load finishes, so the grid never flashes placeholder content.
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  // After a member deletes their account they land here with ?deleted=1.
  const { deleted } = useLocalSearchParams<{ deleted?: string }>();
  useEffect(() => {
    featuredProfiles(6)
      .then(setFeatured)
      .catch(() => setFeatured([]))
      .finally(() => setLoadingFeatured(false));
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.inner}>
        <SiteHeader />
        {deleted ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Text style={styles.noticeText}>Your account has been deleted. Thank you for being part of Independent Journey, and we wish you well on your journey.</Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text
            style={styles.headline}
            accessibilityRole="header"
            aria-level={1}
          >
            Every match{" "}
            <Text style={styles.headlineAccent}>starts here.</Text>
          </Text>
          <Text style={styles.lead}>
            One place for intended parents and gestational surrogates to find
            each other, independent or with an agency, with every profile
            clearly labelled. No match fees. Surrogates always join free.
          </Text>
          <View style={styles.ctaRow}>
            <Button label="I'm a surrogate" onPress={() => router.push('/sign-up?role=surrogate')} />
            <Button label="We're intended parents" variant="secondary" onPress={() => router.push('/sign-up?role=intended_parent')} />
            <Button label="I'm an agency" variant="secondary" onPress={() => router.push('/sign-up?role=agency')} />
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>
              Now open · in beta · surrogates always join free
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.h2} accessibilityRole="header" aria-level={2}>
            Browsing right now
          </Text>
          <Text style={styles.sectionNote}>
            {loadingFeatured || featured.length > 0
              ? "Members on the platform right now. Tap a card to see their preview, or browse everyone."
              : "Real members will appear here as they finish their profiles."}
          </Text>
        </View>

        <View style={styles.cardGrid}>
          {loadingFeatured
            ? [0, 1, 2].map((i) => <View key={i} style={styles.cardPlaceholder} accessibilityLabel="Loading profiles" />)
            : featured.map((p) => (
                <ProfileCard
                  key={p.id}
                  name={p.display_name}
                  state={p.state}
                  role={p.role}
                  verified={verifiedLabel(p)}
                  headline={p.headline_tags.join(" · ")}
                  typeLabel={profileTypeLabel(p)}
                  agency={p.profile_type === 'agency'}
                  photoUrl={p.photo_url}
                  photoUrls={p.photo_urls}
                  onPress={() => router.push(`/profile/${p.id}`)}
                />
              ))}
        </View>
        <View style={styles.ctaRow}>
          <Button label="Browse all profiles" variant="secondary" onPress={() => router.push("/browse")} />
        </View>

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

        <View style={styles.faq}>
          <Text style={styles.h2} accessibilityRole="header" aria-level={2}>
            Common questions about independent surrogacy
          </Text>
          {FAQ.map(([q, a]) => (
            <View key={q} style={styles.faqItem}>
              <Text style={styles.faqQ} accessibilityRole="header" aria-level={3}>{q}</Text>
              <Text style={styles.faqA}>{a}</Text>
            </View>
          ))}
          <View style={styles.ctaRow}>
            <Button label="Read how it works" variant="secondary" onPress={() => router.push("/how-it-works")} />
            <Button label="Safety and resources" variant="secondary" onPress={() => router.push("/resources")} />
          </View>
        </View>

        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const MAX_WIDTH = 1180;

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, marginTop: space.md },
  noticeText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
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
  // Vertical feed: one column on phones, wraps into 2 to 3 columns on wider screens.
  cardPlaceholder: {
    // Same footprint as a ProfileCard, so the page does not jump when real cards arrive.
    flexGrow: 1,
    flexBasis: 300,
    maxWidth: 560,
    height: 400,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
    paddingVertical: space.sm,
  },
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
  faq: { gap: space.md, paddingBottom: space.xl, maxWidth: 820 },
  faqItem: { gap: 4 },
  faqQ: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  faqA: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
});
