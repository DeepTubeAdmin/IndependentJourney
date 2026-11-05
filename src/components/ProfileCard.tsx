/**
 * Large profile card used on the homepage and in browse.
 *
 * Shows only "limited preview" fields: first name, state, role, verified
 * label, and a few headline preferences. Surrogate photos are shown blurred
 * in previews, per the access rules in the master prompt.
 *
 * Phase 2: renders a placeholder silhouette instead of a photo. Real photos
 * arrive with profiles in Phase 3.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '@/lib/theme';

export type ProfileCardProps = {
  name: string;
  state: string;
  role: 'surrogate' | 'intended_parent' | 'intended_parents';
  verified: boolean;
  headline: string;
  /** Marks sample content so nobody reads it as a real member. */
  example?: boolean;
  onPress?: () => void;
};

const ROLE_LABEL = {
  surrogate: 'Surrogate',
  intended_parent: 'Intended parent',
  intended_parents: 'Intended parents',
} as const;

export function ProfileCard({ name, state, role, verified, headline, example, onPress }: ProfileCardProps) {
  const tint = role === 'surrogate' ? styles.photoSky : styles.photoLinen;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${state}, ${ROLE_LABEL[role]}, ${verified ? 'verified' : 'not verified'}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.photo, tint]}>
        <View style={[styles.silhouetteHead, role === 'surrogate' && styles.blurred]} />
        <View style={[styles.silhouetteBody, role === 'surrogate' && styles.blurred]} />
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
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photo: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
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
