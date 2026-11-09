/**
 * Large profile card used on the homepage and in browse.
 *
 * Shows only "limited preview" fields: first name, state, role, verified
 * label, and a few headline preferences. Surrogate photos are shown blurred
 * in previews, per the access rules in the master prompt.
 *
 * With a photoUrl it shows the member's preview image (a tiny 24px copy for
 * surrogates, so it always looks blurred); without one, a soft silhouette.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '@/lib/theme';

export type ProfileCardProps = {
  name: string;
  state: string;
  role: 'surrogate' | 'intended_parent' | 'intended_parents';
  verified: boolean;
  headline: string;
  /** Marks sample content so nobody reads it as a real member. */
  example?: boolean;
  /** Signed URL of the preview image, when the viewer is allowed one. */
  photoUrl?: string;
  onPress?: () => void;
};

const ROLE_LABEL = {
  surrogate: 'Surrogate',
  intended_parent: 'Intended parent',
  intended_parents: 'Intended parents',
} as const;

export function ProfileCard({ name, state, role, verified, headline, example, photoUrl, onPress }: ProfileCardProps) {
  const tint = role === 'surrogate' ? styles.photoSky : styles.photoLinen;
  const blur = role === 'surrogate';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${state}, ${ROLE_LABEL[role]}, ${verified ? 'verified' : 'not verified'}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.photo, tint]}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.img} blurRadius={blur ? 18 : 0} accessibilityIgnoresInvertColors />
        ) : (
          <>
            <View style={[styles.silhouetteHead, blur && styles.blurred]} />
            <View style={[styles.silhouetteBody, blur && styles.blurred]} />
          </>
        )}
        <View style={[styles.badge, verified ? styles.badgeVerified : styles.badgeUnverified]}>
          <Text style={[styles.badgeText, !verified && { color: colors.textMuted }]}>
            {verified ? 'Verified' : 'Not verified'}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeRole]}>
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>
            {example ? 'Example' : ROLE_LABEL[role]}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>
          {name} · {state}
        </Text>
        <Text style={styles.headline}>{headline}</Text>
      </View>
    </Pressable>
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
    height: 340,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
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
  blurred: { opacity: 0.55 },
  badge: {
    position: 'absolute',
    top: 12,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeVerified: { left: 12, backgroundColor: colors.verified },
  badgeUnverified: { left: 12, backgroundColor: 'rgba(255,255,255,0.92)' },
  badgeRole: { right: 12, backgroundColor: 'rgba(255,255,255,0.92)' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryText },
  body: { padding: space.md, gap: 4 },
  name: { fontFamily: fonts.heading, fontSize: 19, color: colors.text },
  headline: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
});
