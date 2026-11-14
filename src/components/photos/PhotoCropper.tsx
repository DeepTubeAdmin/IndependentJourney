/**
 * PhotoCropper: lets a member frame a photo before it is saved.
 *
 * Why: profile cards show photos in a fixed portrait box, and an uncropped
 * phone photo often put the face outside that box. Every photo now goes
 * through this screen first. The member drags the photo to move it and uses
 * the zoom buttons (or a pinch on a phone) to get closer. What is inside the
 * frame is exactly what the cards show.
 *
 * The result is cropped to a 4:5 portrait, shrunk to at most 1200 x 1500
 * pixels and saved as JPEG, so a 5 MB phone photo becomes a few hundred KB.
 * That keeps storage egress low (see docs/PHOTO_CACHE.md).
 *
 * Works on the website and in the apps: plain React Native gestures, no
 * extra libraries. The actual cropping is done by expo-image-manipulator.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Portrait frame, the shape of the photo box on profile cards. */
export const CROP_ASPECT = 4 / 5;
/** Longest edge of a saved photo, in pixels. */
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.85;
const MAX_ZOOM = 4;

type Props = {
  /** The photo to frame: a file picked from the device, or an existing photo's address. */
  uri: string;
  /** "Photo 2 of 4", shown above the frame. */
  label?: string;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
};

type Layout = { scale: number; x: number; y: number };

export function PhotoCropper({ uri, label, onDone, onCancel }: Props) {
  const { width: screenW } = useWindowDimensions();
  const frameW = Math.min(screenW - 2 * space.lg, 340);
  const frameH = Math.round(frameW / CROP_ASPECT);

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  // Live copy for gesture maths (state updates lag behind finger moves).
  const layoutRef = useRef<Layout | null>(null);
  const gestureStart = useRef<{ layout: Layout; pinch?: number } | null>(null);

  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && setSize({ w, h }),
      () => alive && setError('We could not open that photo. Please try another one.'),
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  // The smallest zoom that still fills the frame (no empty edges).
  const minScale = useMemo(() => (size ? Math.max(frameW / size.w, frameH / size.h) : 1), [size, frameW, frameH]);

  // Start centred at the minimum zoom.
  useEffect(() => {
    if (!size) return;
    const first = clamp({ scale: minScale, x: (frameW - size.w * minScale) / 2, y: (frameH - size.h * minScale) / 2 });
    layoutRef.current = first;
    setLayout(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, minScale, frameW, frameH]);

  /** Keeps the photo covering the whole frame. */
  function clamp(l: Layout): Layout {
    if (!size) return l;
    const scale = Math.min(Math.max(l.scale, minScale), minScale * MAX_ZOOM);
    const w = size.w * scale;
    const h = size.h * scale;
    return { scale, x: Math.min(0, Math.max(frameW - w, l.x)), y: Math.min(0, Math.max(frameH - h, l.y)) };
  }

  function apply(l: Layout) {
    const next = clamp(l);
    layoutRef.current = next;
    setLayout(next);
  }

  /** Zooms around the centre of the frame. */
  function zoomTo(scale: number, base?: Layout) {
    const cur = base ?? layoutRef.current;
    if (!cur) return;
    const s = Math.min(Math.max(scale, minScale), minScale * MAX_ZOOM);
    const k = s / cur.scale;
    apply({ scale: s, x: frameW / 2 - (frameW / 2 - cur.x) * k, y: frameH / 2 - (frameH / 2 - cur.y) * k });
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (layoutRef.current) gestureStart.current = { layout: layoutRef.current };
        },
        onPanResponderMove: (evt, g) => {
          const start = gestureStart.current;
          if (!start) return;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            // Pinch: distance between the first two fingers sets the zoom.
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!start.pinch) start.pinch = d;
            zoomTo(start.layout.scale * (d / start.pinch), start.layout);
            return;
          }
          apply({ ...start.layout, x: start.layout.x + g.dx, y: start.layout.y + g.dy });
        },
        onPanResponderRelease: () => {
          gestureStart.current = null;
        },
        onPanResponderTerminate: () => {
          gestureStart.current = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, minScale, frameW, frameH],
  );

  async function save() {
    const l = layoutRef.current;
    if (!size || !l) return;
    setSaving(true);
    setError('');
    try {
      // The frame, translated back into the original photo's pixels.
      const originX = Math.min(size.w - 1, Math.max(0, Math.round(-l.x / l.scale)));
      const originY = Math.min(size.h - 1, Math.max(0, Math.round(-l.y / l.scale)));
      const crop = {
        originX,
        originY,
        // Never past the photo's edge (rounding could add a pixel, which some devices reject).
        width: Math.max(1, Math.min(size.w - originX, Math.round(frameW / l.scale))),
        height: Math.max(1, Math.min(size.h - originY, Math.round(frameH / l.scale))),
      };
      let ctx = ImageManipulator.manipulate(uri).crop(crop);
      if (crop.width > MAX_WIDTH) ctx = ctx.resize({ width: MAX_WIDTH });
      const image = await ctx.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
      onDone(result.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while saving the photo.');
      setSaving(false);
    }
  }

  const zoomPct = layout ? Math.round((layout.scale / minScale) * 100) : 100;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label ? `${label}: ` : ''}Frame your photo</Text>
      <Text style={styles.hint}>Drag the photo so your face is inside the frame. Use the buttons (or pinch) to zoom. This is exactly what others will see.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={[styles.frame, { width: frameW, height: frameH }]} {...pan.panHandlers}>
        {size && layout ? (
          <Image
            source={{ uri }}
            style={{ position: 'absolute', left: layout.x, top: layout.y, width: size.w * layout.scale, height: size.h * layout.scale }}
            accessibilityLabel="Photo being framed"
            accessibilityIgnoresInvertColors
          />
        ) : !error ? (
          <ActivityIndicator color={colors.primary} />
        ) : null}
        {/* Thirds grid, a light guide for centring. */}
        {layout ? (
          <>
            <View pointerEvents="none" style={[styles.gridLine, { left: '33.3%', top: 0, bottom: 0, width: 1 }]} />
            <View pointerEvents="none" style={[styles.gridLine, { left: '66.6%', top: 0, bottom: 0, width: 1 }]} />
            <View pointerEvents="none" style={[styles.gridLine, { top: '33.3%', left: 0, right: 0, height: 1 }]} />
            <View pointerEvents="none" style={[styles.gridLine, { top: '66.6%', left: 0, right: 0, height: 1 }]} />
          </>
        ) : null}
      </View>
      <View style={styles.zoomRow}>
        <Pressable onPress={() => zoomTo((layoutRef.current?.scale ?? minScale) / 1.2)} accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.zoomBtn} disabled={!layout || saving}>
          <Text style={styles.zoomText}>−</Text>
        </Pressable>
        <Text style={styles.zoomLabel}>Zoom {zoomPct}%</Text>
        <Pressable onPress={() => zoomTo((layoutRef.current?.scale ?? minScale) * 1.2)} accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.zoomBtn} disabled={!layout || saving}>
          <Text style={styles.zoomText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.nav}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
        <Button label={saving ? 'Saving…' : 'Use this photo'} onPress={save} disabled={!layout || saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, alignItems: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, alignSelf: 'stretch' },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 20, alignSelf: 'stretch' },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.danger, alignSelf: 'stretch' },
  frame: {
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Web only: show a grab cursor and stop the browser from scrolling or zooming the page while dragging.
    ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object) : {}),
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  zoomBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.text, lineHeight: 26 },
  zoomLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, minWidth: 90, textAlign: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, alignSelf: 'stretch' },
});
