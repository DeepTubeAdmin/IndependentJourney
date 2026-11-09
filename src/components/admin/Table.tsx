/**
 * Simple list for admin pages: a header row and tappable rows.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '@/lib/theme';

export type Col<T> = { key: string; label: string; flex?: number; render: (row: T) => React.ReactNode };

export function Table<T>({ cols, rows, keyOf, onPress, empty = 'Nothing here.' }: { cols: Col<T>[]; rows: T[]; keyOf: (r: T) => string; onPress?: (r: T) => void; empty?: string }) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.head]}>
        {cols.map((c) => (
          <Text key={c.key} style={[styles.cell, styles.headText, { flex: c.flex ?? 1 }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
      {rows.map((r) => (
        <Pressable key={keyOf(r)} onPress={onPress ? () => onPress(r) : undefined} style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]} accessibilityRole={onPress ? 'button' : undefined}>
          {cols.map((c) => (
            <View key={c.key} style={[styles.cell, { flex: c.flex ?? 1 }]}>
              {typeof c.render(r) === 'string' || typeof c.render(r) === 'number' ? <Text style={styles.cellText}>{String(c.render(r))}</Text> : c.render(r)}
            </View>
          ))}
        </Pressable>
      ))}
    </View>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const bg = tone === 'good' ? '#E3F1E8' : tone === 'warn' ? '#FBEBD6' : tone === 'bad' ? '#F6DEDB' : colors.surfaceSoft;
  const fg = tone === 'good' ? colors.verified : tone === 'warn' ? '#8A5A14' : tone === 'bad' ? colors.danger : colors.textMuted;
  return (
    <Text style={[styles.pill, { backgroundColor: bg, color: fg }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  table: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: space.sm },
  head: { borderTopWidth: 0, backgroundColor: colors.surfaceSoft },
  headText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  cell: { minWidth: 0 },
  cellText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  pressed: { backgroundColor: colors.background },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle, padding: space.md },
  pill: { alignSelf: 'flex-start', fontFamily: fonts.bodyMedium, fontSize: 12, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
});
