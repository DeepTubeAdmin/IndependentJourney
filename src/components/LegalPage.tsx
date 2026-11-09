/**
 * Shared layout for Terms, Privacy and Disclaimer.
 * PLACEHOLDER WORDING: every legal page must be reviewed and replaced by the attorney before launch.
 */
import { StyleSheet, Text } from 'react-native';

import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { LEGAL_VERSION } from '@/config/settings';
import { colors, fonts } from '@/lib/theme';

export function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string }[] }) {
  return (
    <Screen title={title} intro={`Version ${LEGAL_VERSION}`} width={720} showWordmark>
      <FormMessage kind="info" text="Draft for attorney review. This wording is a placeholder and is not yet legal advice or a final agreement." />
      {sections.map((s) => (
        <Text key={s.heading}>
          <Text style={styles.heading}>{s.heading}{'\n'}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, lineHeight: 34 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 24 },
});
