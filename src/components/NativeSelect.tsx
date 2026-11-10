/**
 * A plain drop-down. On the web (NativeSelect.web.tsx) it is the browser's
 * own <select>. This native fallback shows the options as tappable pills.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from '@/config/questionnaire';
import { colors, fonts, radius } from '@/lib/theme';

export type NativeSelectProps = { options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; accessibilityLabel: string; width?: number };

export function NativeSelect({ options, value, onChange }: NativeSelectProps) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" style={[styles.pill, o.value === value && styles.active]}>
          <Text style={[styles.text, o.value === value && styles.activeText]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  activeText: { color: colors.primaryText },
});
