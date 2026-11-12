/**
 * Final step: shows whether the profile is complete and what's missing.
 * Completeness itself is computed by the database (compute_profile_complete).
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { FINAL_STEPS, stepsFor } from '@/config/questionnaire';
import { useSession } from '@/lib/auth';
import { loadAnswers, loadPhotos, type Answers } from '@/lib/profile';
import { colors, fonts, radius, space } from '@/lib/theme';

export function ReviewStep({ header, onBack }: { header: React.ReactNode; onBack: () => void }) {
  const { session, profile, refreshProfile } = useSession();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    if (!session || !profile) return;
    refreshProfile();
    loadAnswers(session.user.id, stepsFor(profile.role)).then(setAnswers);
    loadPhotos(session.user.id).then((p) => setPhotoCount(p.length));
  }, [session, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile || !session) return null;
  const steps = stepsFor(profile.role);

  // Which required questions are still blank?
  const missing: { step: number; label: string }[] = [];
  if (answers) {
    steps.forEach((s, i) =>
      s.fields.forEach((f) => {
        if (!f.required) return;
        const v = answers[f.key];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) missing.push({ step: i, label: f.label });
      }),
    );
  }
  const photosMissing = Math.max(0, 3 - photoCount);
  const bioMissing = !profile.bio;

  return (
    <Screen title={profile.is_complete ? 'Your profile is live' : 'Almost there'} intro={profile.is_complete ? 'Members on the other side of the journey can now find you.' : 'A profile becomes visible once every required question is answered and 3 photos are uploaded.'}>
      {header}
      {profile.is_complete ? (
        <FormMessage kind="info" text="You're all set. Verifying your identity (free, optional) ranks your profile higher and shows a Verified label. You can do that from your profile page." />
      ) : null}

      {/* Every section, so a member can change answers at any time. */}
      <Text style={styles.sectionTitle}>Edit a section</Text>
      <View style={styles.list}>
        {steps.map((s, i) => (
          <Row key={s.title} text={s.title} action="Edit" onPress={() => router.push(`/onboarding/${i}?from=review`)} />
        ))}
        <Row text="Photos" action="Edit" onPress={() => router.push('/onboarding/photos')} />
        <Row text="Your story" action="Edit" onPress={() => router.push('/onboarding/bio')} />
      </View>

      {!profile.is_complete ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Still needed</Text>
          {photosMissing > 0 ? <Row text={`Add ${photosMissing} more photo${photosMissing === 1 ? '' : 's'}`} onPress={() => router.push('/onboarding/photos')} /> : null}
          {bioMissing ? <Row text="Write your bio" onPress={() => router.push('/onboarding/bio')} /> : null}
          {missing.map((m) => (
            <Row key={m.label} text={m.label} onPress={() => router.push(`/onboarding/${m.step}?from=review`)} />
          ))}
          {answers && missing.length === 0 && photosMissing === 0 && !bioMissing ? (
            <Text style={styles.note}>Everything looks filled in. Go back and press Save on any section to refresh; if this message stays, email us.</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        <Button label={profile.is_complete ? 'Go to my account' : 'Save and finish later'} onPress={() => router.replace('/home')} />
      </View>
      <Text style={styles.note}>Last step on the way: {FINAL_STEPS.length} of {FINAL_STEPS.length}.</Text>
    </Screen>
  );
}

function Row({ text, action = 'Fix', onPress }: { text: string; action?: string; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{text}</Text>
      <Button label={action} size="sm" variant="secondary" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginTop: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  rowText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
});
