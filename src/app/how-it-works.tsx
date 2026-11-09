/** Plain-English walkthrough of the platform for both sides. */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Disclaimer } from '@/components/Disclaimer';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, space } from '@/lib/theme';

const STEPS = [
  { n: '1', title: 'Create a free profile', body: 'Surrogates join free, always. Intended parents browse limited previews for free and unlock full profiles and messaging with a membership. Everyone answers the same thoughtful questions about their journey, timeline and preferences.' },
  { n: '2', title: 'Browse, save and compare', body: 'Browse by state or distance, see who is recently active, and save profiles to come back to. Verified members are clearly labelled; so are those who have not verified yet.' },
  { n: '3', title: 'Send a message', body: 'When a profile feels right, write to them here. Surrogates can message any intended parent once their profile is complete. Messages are scanned for scam patterns, and you can block or report anyone at any time.' },
  { n: '4', title: 'Get to know each other', body: 'Talk about expectations, timeline, relationship level and compensation. When you are both comfortable, verify each other the old-fashioned way: a video call with photo ID, and a conversation with each other’s clinic or attorney.' },
  { n: '5', title: 'Take the next step off the platform', body: 'We make introductions, nothing more. Your clinic handles medical screening, and reproductive attorneys for both sides draw up the agreement and manage any payments through escrow. Never send money to anyone you meet here.' },
];

export default function HowItWorks() {
  return (
    <Screen width={760} title="How it works" intro="A calm, agency-free way for intended parents and gestational surrogates to find each other.">
      {STEPS.map((s) => (
        <View key={s.n} style={styles.step}>
          <View style={styles.num}><Text style={styles.numText}>{s.n}</Text></View>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepText}>{s.body}</Text>
          </View>
        </View>
      ))}
      <View style={styles.cta}>
        <Button label="Join free" onPress={() => router.push('/join')} />
        <Button label="Browse profiles" variant="secondary" onPress={() => router.push('/browse')} />
      </View>
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryText },
  stepBody: { flex: 1, gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md },
  stepTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  stepText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  cta: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
