/**
 * The app's button. Two looks: primary (brown) and secondary (outlined blue).
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        secondary ? styles.secondary : styles.primary,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.label, size === 'sm' && styles.labelSm, secondary && styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 9 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.secondaryBorder },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryText },
  labelSm: { fontSize: 14 },
  labelSecondary: { color: colors.secondary },
});
