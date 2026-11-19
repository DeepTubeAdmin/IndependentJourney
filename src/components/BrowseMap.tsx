/**
 * Map of approximate member locations, for the phone apps. The website
 * version lives in BrowseMap.web.tsx (OpenStreetMap).
 *
 * iPhone and iPad use Apple Maps, which needs no key or account. Android
 * needs a Google Maps key before a map can be shown, so until that is set up
 * (EXPO_PUBLIC_ANDROID_MAPS=1 in the build) Android shows a short note.
 *
 * Same privacy rule as the website: a dot is the centre of a ZIP area, never
 * an address.
 */
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components/Button';
import type { PreviewRow } from '@/lib/browse';
import { colors, fonts, radius, space } from '@/lib/theme';

export type BrowseMapProps = {
  rows: PreviewRow[];
  center?: { lat: number; lng: number } | null;
  onOpen: (id: string) => void;
};

const mapAvailable = Platform.OS === 'ios' || process.env.EXPO_PUBLIC_ANDROID_MAPS === '1';

// The whole continental US, or roughly a two-hour drive around the member.
const US_REGION = { latitude: 39.5, longitude: -98.35, latitudeDelta: 45, longitudeDelta: 60 };

function describe(p: PreviewRow): string {
  const who = p.role === 'surrogate' ? 'Surrogate' : 'Intended parent';
  const badge = p.profile_type === 'agency' ? `Agency: ${p.agency_name || 'agency'}` : p.is_verified ? 'Verified' : 'Not verified';
  return `${who} · ${badge}`;
}

export function BrowseMap({ rows, center, onOpen }: BrowseMapProps) {
  const points = useMemo(() => rows.filter((r) => r.approx_lat != null && r.approx_lng != null), [rows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  if (!mapAvailable) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>The map view is coming to Android soon. For now it is available on the website.</Text>
      </View>
    );
  }

  const missing = rows.length - points.length;
  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={center ? { latitude: center.lat, longitude: center.lng, latitudeDelta: 4, longitudeDelta: 4 } : US_REGION}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          onPress={() => setSelectedId(null)}
        >
          {center ? <Marker coordinate={{ latitude: center.lat, longitude: center.lng }} pinColor={colors.text} title="You (approximate)" tappable={false} /> : null}
          {points.map((p) => (
            <Marker
              key={p.id}
              identifier={p.id}
              coordinate={{ latitude: p.approx_lat as number, longitude: p.approx_lng as number }}
              pinColor={p.role === 'surrogate' ? colors.secondary : colors.primary}
              // Stop the tap reaching the map underneath, which would clear the choice again.
              onPress={(e) => { e.stopPropagation(); setSelectedId(p.id); }}
              accessibilityLabel={`${p.display_name}, ${p.state || p.country || ''}`}
            />
          ))}
        </MapView>
      </View>
      {selected ? (
        <View style={styles.card}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{selected.display_name}{selected.state ? ` · ${selected.state}` : ''}</Text>
            <Text style={styles.sub} numberOfLines={1}>{describe(selected)}</Text>
          </View>
          <Button label="View profile" size="sm" onPress={() => onOpen(selected.id)} />
        </View>
      ) : (
        <Text style={styles.hint}>Tap a pin to see who it is.</Text>
      )}
      <Text style={styles.note}>
        Locations are approximate (ZIP area), never an address.{missing > 0 ? ` ${missing} member${missing === 1 ? ' has' : 's have'} not added a ZIP code yet and appear in the list only.` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  mapBox: { height: 420, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  box: { backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, padding: space.lg, alignItems: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
