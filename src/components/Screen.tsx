/**
 * A centered, scrollable page frame used by auth and onboarding screens.
 */
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SiteHeader } from '@/components/SiteHeader';
import { colors, fonts, space } from '@/lib/theme';

type Props = {
  title: string;
  intro?: string;
  children: React.ReactNode;
  /** Narrow (forms) or wide (content). */
  width?: number;
  showWordmark?: boolean;
};

export function Screen({ title, intro, children, width = 560, showWordmark = true }: Props) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={[styles.inner, { maxWidth: width }]}>
          {showWordmark ? <SiteHeader /> : null}
          <Text style={styles.title} accessibilityRole="header" aria-level={1}>
            {title}
          </Text>
          {intro ? <Text style={styles.intro}>{intro}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.background, padding: space.md, paddingVertical: space.xl },
  inner: { width: '100%', alignSelf: 'center', gap: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 36, color: colors.text, marginTop: space.sm },
  intro: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  body: { marginTop: space.md, gap: space.lg },
});
