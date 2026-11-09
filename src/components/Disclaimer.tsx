/**
 * The platform disclaimer. Shown in the footer of public pages.
 * PLACEHOLDER WORDING: must be reviewed by a reproductive-law attorney.
 */
import { StyleSheet, Text, View } from 'react-native';

import { SITE } from '@/config/settings';
import { colors, fonts, space } from '@/lib/theme';

export function Disclaimer() {
  return (
    <View style={styles.box} accessibilityRole="summary">
      <Text style={styles.text}>
        {SITE.name} is an introduction platform. We are not a surrogacy agency, law firm, or medical
        provider, and we do not give legal, medical, or surrogacy advice or recommendations. Members
        are responsible for verifying everything themselves.
      </Text>
      <Text style={styles.small}>
        © {new Date().getFullYear()} {SITE.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.textMuted },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
