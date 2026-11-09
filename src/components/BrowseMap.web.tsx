/**
 * Web map wrapper: loads the Leaflet map only in the browser, after the page
 * is on screen (the static site build has no window object).
 */
import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BrowseMapProps } from '@/components/BrowseMap';
import { colors, fonts, radius, space } from '@/lib/theme';

export function BrowseMap(props: BrowseMapProps) {
  const [Map, setMap] = useState<ComponentType<BrowseMapProps> | null>(null);
  useEffect(() => {
    let alive = true;
    import('@/components/LeafletMap.web').then((m) => {
      if (alive) setMap(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!Map) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>Loading map…</Text>
      </View>
    );
  }
  return <Map {...props} />;
}

const styles = StyleSheet.create({
  box: { height: 520, backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
});
