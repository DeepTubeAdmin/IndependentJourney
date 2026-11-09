/**
 * The actual Leaflet map (web only). Loaded lazily by BrowseMap.web.tsx
 * because Leaflet needs a browser window, which the static build lacks.
 */
import 'leaflet/dist/leaflet.css';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { StyleSheet, Text, View } from 'react-native';

import type { BrowseMapProps } from '@/components/BrowseMap';
import { colors, fonts, radius, space } from '@/lib/theme';

const US_CENTER: [number, number] = [39.5, -98.35];

export default function LeafletMap({ rows, center, onOpen }: BrowseMapProps) {
  const points = rows.filter((r) => r.approx_lat != null && r.approx_lng != null);
  const start: [number, number] = center ? [center.lat, center.lng] : US_CENTER;
  return (
    <View style={styles.wrap}>
      <div style={{ height: 520, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
        <MapContainer center={start} zoom={center ? 7 : 4} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {center ? <CircleMarker center={[center.lat, center.lng]} radius={6} pathOptions={{ color: colors.text, fillColor: colors.text, fillOpacity: 0.9 }}><Popup>You (approximate)</Popup></CircleMarker> : null}
          {points.map((p) => {
            const c = p.role === 'surrogate' ? colors.secondary : colors.primary;
            return (
              <CircleMarker key={p.id} center={[p.approx_lat as number, p.approx_lng as number]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: c, fillOpacity: 0.9 }}>
                <Popup>
                  <div style={{ fontFamily: 'Figtree, sans-serif', minWidth: 160 }}>
                    <strong>{p.display_name}</strong> · {p.state}
                    <br />
                    {p.role === 'surrogate' ? 'Surrogate' : 'Intended parent'} · {p.is_verified ? 'Verified' : 'Not verified'}
                    <br />
                    <button type="button" onClick={() => onOpen(p.id)} style={{ marginTop: 8, cursor: 'pointer', border: 0, borderRadius: 999, padding: '6px 12px', background: c, color: '#fff', fontWeight: 600 }}>
                      View profile
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <Text style={styles.note}>
        Locations are approximate (ZIP area), never an address.{points.length < rows.length ? ` ${rows.length - points.length} member${rows.length - points.length === 1 ? ' has' : 's have'} not added a ZIP code yet and appear in the list only.` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, borderRadius: radius.lg },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
});
