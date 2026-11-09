/**
 * Resources: general information for people considering independent
 * surrogacy. PLACEHOLDER CONTENT for Seth and the attorney to review; it is
 * general information, not legal or medical advice.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Disclaimer } from '@/components/Disclaimer';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, space } from '@/lib/theme';

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

export default function Resources() {
  return (
    <Screen width={760} title="Resources" intro="General information to help you plan a safe, well-supported independent journey.">
      <FormMessage kind="info" text="This page is general information, not legal, medical or financial advice. Please consult your own attorney and clinic." />
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <Text style={styles.title}>{s.title}</Text>
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
});
