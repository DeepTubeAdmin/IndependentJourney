/**
 * Map of approximate member locations. This file is the fallback for the
 * native apps (a native map arrives with the mobile phase); the web version
 * lives in BrowseMap.web.tsx.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { PreviewRow } from '@/lib/browse';
import { colors, fonts, radius, space } from '@/lib/theme';

export type BrowseMapProps = {
  rows: PreviewRow[];
  center?: { lat: number; lng: number } | null;
  onOpen: (id: string) => void;
};

export function BrowseMap(_props: BrowseMapProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>The map view is available on the website for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, padding: space.lg, alignItems: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
});
