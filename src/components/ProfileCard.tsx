/**
 * Large profile card used on the homepage and in browse.
 *
 * Shows only "limited preview" fields: first name, state, role, profile type
 * label, a few headline preferences and the member's photos, all unblurred
 * (Seth's decision, 2026-11-11). With several photos the card becomes a small
 * swiper: swipe or use the arrows, with dots underneath. Without a photo, a
 * soft silhouette.
 *
 * Speed: the photo box is square (the shape members frame their photos in),
 * photos are asked for at card size rather than full size, only the first
 * photo loads with the card (the rest load when someone starts swiping), and
 * on the website cards below the screen wait until they are scrolled near.
 */
import { useRef, useState } from 'react';
import { type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Photo } from '@/components/Photo';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Pixels asked for per card photo: about twice the widest card, for sharp phone screens. */
const CARD_PHOTO_SIZE = 800;

export type ProfileCardProps = {
  name: string;
  state: string;
  role: 'surrogate' | 'intended_parent' | 'intended_parents';
  /** true shows a green "Verified" check at the right of the name line; false or null shows nothing. */
  verified: boolean | null;
  headline: string;
  /** Signed URL of the first photo (used when photoUrls is not given). */
  photoUrl?: string;
  /** Signed URLs of all photos; when given, the card shows a swiper. */
  photoUrls?: string[];
  /** Small extra line, e.g. distance from the viewer. */
  meta?: string;
  /** "Independent", "Agency: Name", ... shown under the name. */
  typeLabel?: string;
  /** True for agency-posted profiles: the top-left pill reads "Agency" instead of "Independent". */
  agency?: boolean;
  onPress?: () => void;
};

const ROLE_LABEL = {
  surrogate: 'Surrogate',
  intended_parent: 'Intended parent',
  intended_parents: 'Intended parents',
} as const;

export function ProfileCard({ name, state, role, verified, headline, photoUrl, photoUrls, meta, typeLabel, agency, onPress }: ProfileCardProps) {
  const tint = role === 'surrogate' ? styles.photoSky : styles.photoLinen;
  const urls = photoUrls && photoUrls.length ? photoUrls : photoUrl ? [photoUrl] : [];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${state}, ${ROLE_LABEL[role]}, ${agency ? 'agency' : 'independent'}${verified ? ', verified' : ''}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.photo, tint]}>
        {urls.length > 1 ? (
          <PhotoSwiper urls={urls} name={name} />
        ) : urls.length === 1 ? (
          <Photo uri={urls[0]} size={CARD_PHOTO_SIZE} style={styles.img} label={`Photo of ${name}`} />
        ) : (
          <>
            <View style={styles.silhouetteHead} />
            <View style={styles.silhouetteBody} />
          </>
        )}
        {/* Top-left pill: profile type (Seth's choice, 2026-11-13). */}
        <View style={[styles.badge, styles.badgeType]}>
          <Text style={styles.badgeText}>{agency ? 'Agency' : 'Independent'}</Text>
        </View>
        <View style={[styles.badge, styles.badgeRole]}>
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>
            {ROLE_LABEL[role]}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {name} · {state}
          </Text>
          {verified ? (
            <View style={styles.verifiedRow}>
              <View style={styles.verifiedDot}>
                <Text style={styles.verifiedCheck}>✓</Text>
              </View>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
        {typeLabel ? <Text style={styles.typeLabel}>{typeLabel}</Text> : null}
        <Text style={styles.headline}>{headline}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Horizontal, one photo per page, with arrows and dots. */
function PhotoSwiper({ urls, name }: { urls: string[]; name: string }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  // Only the first photo loads with the card. The others load once someone starts swiping.
  const [loadAll, setLoadAll] = useState(false);
  const scroller = useRef<React.ElementRef<typeof ScrollView>>(null);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    if (e.nativeEvent.contentOffset.x > 4) setLoadAll(true);
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(Math.max(0, Math.min(urls.length - 1, i)));
  }
  function goTo(i: number) {
    setLoadAll(true);
    const next = (i + urls.length) % urls.length;
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  return (
    <View style={styles.swiper} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          onTouchStart={() => setLoadAll(true)}
          style={styles.swiper}
          contentContainerStyle={{ width: width * urls.length }}
        >
          {urls.map((u, i) => (
            i === 0 || loadAll
              ? <Photo key={u} uri={u} size={CARD_PHOTO_SIZE} lazy={i === 0} style={{ width, height: '100%' }} label={`Photo ${i + 1} of ${urls.length} of ${name}`} />
              : <View key={u} style={{ width, height: '100%' }} />
          ))}
        </ScrollView>
      ) : null}
      {/* Arrows: stopPropagation-style handling so a tap on them does not open the profile. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => goTo(index - 1)} style={[styles.arrow, styles.arrowLeft]} hitSlop={8}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => goTo(index + 1)} style={[styles.arrow, styles.arrowRight]} hitSlop={8}>
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
      <View style={styles.dots} pointerEvents="none">
        {urls.map((u, i) => (
          <View key={u} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Fills one column: full width on phones, ~3 across on desktop.
    flexGrow: 1,
    flexBasis: 300,
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photo: {
    // Square, the same shape photos are framed in.
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  swiper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  arrowText: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 28, color: colors.text, marginTop: -2 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 18 },
  photoSky: { backgroundColor: '#DCE7EE' },
  photoLinen: { backgroundColor: '#EADFD3' },
  silhouetteHead: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(79,74,68,0.35)',
    marginBottom: 10,
  },
  silhouetteBody: {
    width: 190,
    height: 90,
    borderTopLeftRadius: 95,
    borderTopRightRadius: 95,
    backgroundColor: 'rgba(79,74,68,0.35)',
  },
  badge: {
    position: 'absolute',
    top: 12,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeType: { left: 12, backgroundColor: colors.secondary },
  badgeRole: { right: 12, backgroundColor: 'rgba(255,255,255,0.92)' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryText },
  body: { padding: space.md, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { fontFamily: fonts.heading, fontSize: 19, color: colors.text, flexShrink: 1 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.verified, alignItems: 'center', justifyContent: 'center' },
  verifiedCheck: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 13, color: colors.primaryText },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.verified },
  typeLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.secondary, letterSpacing: 0.2, marginBottom: 2 },
  headline: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.secondary, marginTop: 4 },
});
