/**
 * Photo: a member photo shown at a sensible size, loaded only when needed.
 *
 * Two things make cards quick:
 *  - Small versions. A card is a few hundred pixels wide, so it asks for a
 *    photo that size (in a modern, lighter format) instead of the stored
 *    1200-pixel original. Netlify's image service makes and caches the small
 *    copy the first time anyone asks for it. If that ever fails, the photo
 *    falls back to the original, so a card never ends up blank.
 *  - Lazy loading (website). A photo further down the page is only fetched
 *    when the visitor scrolls near it.
 *
 * Photos are shown square, anchored to the top of the picture, which is the
 * same shape members frame their photos in (see PhotoCropper). Older photos
 * that were framed as a tall rectangle keep the face in view this way.
 */
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { SITE } from '@/config/settings';

/**
 * Address of a square copy of a cached photo, `size` pixels on each side.
 * Anything that is not one of our cached photos (/photos/...) is returned as is.
 */
export function sizedPhotoUrl(uri: string, size: number): string {
  const at = uri.indexOf('/photos/');
  if (at < 0 || uri.startsWith('blob:') || uri.startsWith('data:')) return uri;
  // The image service fetches the original by its full public address.
  const source = `${SITE.url}${uri.slice(at)}`;
  const base = Platform.OS === 'web' ? '' : SITE.url;
  return `${base}/.netlify/images?url=${encodeURIComponent(source)}&w=${size}&h=${size}&fit=cover&position=top&q=72`;
}

type Props = {
  /** The photo's normal address (see cachedPhotoUrl). */
  uri: string;
  /** Pixels on each side to ask for. Roughly twice the size it is shown at, for sharp phone screens. */
  size: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
  /** Website only: wait until the photo is near the screen. On by default. */
  lazy?: boolean;
};

export function Photo({ uri, size, style, label, lazy = true }: Props) {
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState(Platform.OS !== 'web' || !lazy);
  const box = useRef<React.ElementRef<typeof View>>(null);

  useEffect(() => {
    if (show) return;
    const node = box.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    // Start loading a little before the photo scrolls into view.
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          watcher.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [show]);

  return (
    <View ref={box} style={[styles.box, style]}>
      {show ? (
        <Image
          source={{ uri: failed ? uri : sizedPhotoUrl(uri, size) }}
          onError={() => setFailed(true)}
          style={styles.fill}
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
});
