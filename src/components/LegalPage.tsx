/**
 * Shared layout for Terms, Privacy and Disclaimer.
 * The wording was reviewed and approved by the owner's attorney (November 2026).
 */
import { Linking, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { LEGAL_VERSION, SITE } from '@/config/settings';
import { colors, fonts } from '@/lib/theme';

export function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string }[] }) {
  return (
    <Screen title={title} intro={`Version ${LEGAL_VERSION}`} width={720} showWordmark>
      {sections.map((s) => (
        <Text key={s.heading}>
          <Text style={styles.heading}>{s.heading}{'\n'}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
      <Text style={styles.body}>
        Contact us:{' '}
        <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${SITE.supportEmail}`)}>{SITE.supportEmail}</Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, lineHeight: 34 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 24 },
});
