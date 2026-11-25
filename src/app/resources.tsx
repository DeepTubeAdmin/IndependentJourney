/**
 * Resources: general information for people considering independent
 * surrogacy. PLACEHOLDER CONTENT for Seth and the attorney to review; it is
 * general information, not legal or medical advice.
 */
import { type Href, Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Disclaimer } from '@/components/Disclaimer';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, space } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Independent Surrogacy Resources and Safety Guide',
    description:
      'General information for intended parents and surrogates planning an independent journey: who you need on your team, how to stay safe, state law basics and trusted organisations.',
    path: '/resources',
  });
}

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Before you start',
    items: [
      'Independent surrogacy means the intended parents and surrogate find each other and coordinate the journey themselves, with a fertility clinic for the medical side and separate reproductive attorneys for the legal side.',
      'Laws differ a lot by state: some are very surrogacy-friendly, some restrict compensated surrogacy, and a few prohibit it. Talk to a reproductive attorney licensed where the surrogate lives and where the baby would be born.',
      'Medical eligibility is always decided by a clinic, never by a website or by either party.',
    ],
  },
  {
    title: 'Protecting yourself',
    items: [
      'Verify who you are talking to: a live video call with a photo ID, plus confirmation from their clinic or attorney.',
      'Never send money to anyone you meet online. In a real surrogacy arrangement, compensation and expenses go through an attorney-managed escrow account after a signed contract.',
      'Be cautious of anyone who pressures you to move fast, asks for fees, gift cards, wire transfers or payment apps, or wants to leave the platform before you have met.',
      'Use the Report button on any profile or message if something feels wrong. Our safety team reviews every report.',
    ],
  },
  {
    title: 'Who you will need on your team',
    items: [
      'A fertility clinic (IVF clinic) to perform screening and the embryo transfer.',
      'A reproductive attorney for each side to draft the gestational carrier agreement and handle pre-birth or post-birth parentage orders.',
      'An escrow or trust service, usually arranged by the attorneys, to hold and release funds.',
      'A mental-health professional experienced in third-party reproduction for the psychological evaluation most clinics require.',
      'Insurance review: check whether the surrogate’s health insurance covers or excludes surrogacy, and plan for a policy that does.',
    ],
  },
  {
    title: 'Helpful organisations',
    items: [
      'American Society for Reproductive Medicine (ASRM) – guidance on gestational carrier screening: asrm.org',
      'Academy of Adoption & Assisted Reproduction Attorneys (AAAA) – find a reproductive attorney: adoptionart.org',
      'RESOLVE: The National Infertility Association – support and education: resolve.org',
      'Men Having Babies – resources for gay intended parents: menhavingbabies.org',
    ],
  },
];

/** Articles that live on their own page under /resources/. */
const ARTICLES: { title: string; blurb: string; path: Href }[] = [
  { title: 'Surrogacy Laws by State', blurb: 'Law in brief for all 50 states and DC, each checked against two published sources, with the members in each state.', path: '/surrogacy' },
  { title: 'How to Find a Surrogate Without an Agency', blurb: 'Where intended parents find surrogates on their own, how to screen, and the professionals you still need.', path: '/resources/find-a-surrogate-without-an-agency' },
  { title: 'How to Become an Independent Surrogate', blurb: 'What clinics look for, the steps, and how to protect yourself without an agency.', path: '/resources/become-an-independent-surrogate' },
  { title: 'What Independent Surrogacy Costs Compared With an Agency', blurb: 'Published cost ranges with sources, what going independent removes, and what stays the same.', path: '/resources/independent-surrogacy-cost' },
  { title: 'How Surrogate Compensation Works', blurb: 'Base compensation, what is paid on top, escrow, state limits and the tax question.', path: '/resources/surrogate-compensation' },
  { title: 'Independent Surrogacy Versus an Agency', blurb: 'What an agency does, what you take on yourself, and who each route suits.', path: '/resources/independent-vs-agency-surrogacy' },
  { title: 'The Legal Steps of a Surrogacy Journey', blurb: 'Attorneys, the carrier agreement, escrow, and pre-birth and post-birth parentage orders.', path: '/resources/surrogacy-legal-steps' },
  {
    title: 'The First Conversation: What to Ask Before You Match',
    blurb: 'A thorough question list for the first call between a surrogate and intended parents, with the hard questions first.',
    path: '/resources/first-conversation',
  },
  {
    title: 'After the Match: The Steps of an Independent Journey',
    blurb: 'OB clearance, clinic screening, counseling, legal, mock cycle, transfer and birth, with typical timing for each.',
    path: '/resources/after-the-match',
  },
];

export default function Resources() {
  return (
    <Screen width={760} title="Resources" intro="General information to help you plan a safe, well-supported independent journey.">
      <FormMessage kind="info" text="This page is general information, not legal, medical or financial advice. Please consult your own attorney and clinic." />
      {/* Longer articles get their own page; list them here. */}
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header" aria-level={2}>Guides</Text>
        {ARTICLES.map((a) => (
          <View key={String(a.path)} style={styles.article}>
            {/* A real link, so search engines and AI tools can follow it. */}
            <Link href={a.path} style={styles.articleTitle}>{a.title}</Link>
            <Text style={styles.item}>{a.blurb}</Text>
          </View>
        ))}
      </View>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <Text style={styles.title} accessibilityRole="header" aria-level={2}>{s.title}</Text>
          {s.items.map((t) => (
            <Text key={t} style={styles.item}>• {t}</Text>
          ))}
        </View>
      ))}
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 4 },
  item: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  article: { gap: 2, paddingVertical: space.xs },
  articleTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.primary, textDecorationLine: 'underline' },
});
