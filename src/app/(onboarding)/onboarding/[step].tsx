/**
 * One onboarding screen. The questionnaire steps come from
 * src/config/questionnaire.ts; after them come photos, bio and review.
 *
 * URL: /onboarding/0, /onboarding/1, ... then /onboarding/photos, /onboarding/bio, /onboarding/review
 * An agency editing a client profile adds ?for=<profile id>; the same screens
 * then read and save that profile instead of the signed-in member's.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { FieldControl } from '@/components/onboarding/FieldControl';
import { BioStep } from '@/components/onboarding/BioStep';
import { PhotosStep } from '@/components/onboarding/PhotosStep';
import { ReviewStep } from '@/components/onboarding/ReviewStep';
import { Screen } from '@/components/Screen';
import { FINAL_STEPS, stepsFor } from '@/config/questionnaire';
import { useSession, type Profile } from '@/lib/auth';
import { loadAnswers, saveStep, validateStep, type Answers } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Your profile');
}

export default function OnboardingStep() {
  // `from=review` means the member clicked Edit on the review page: save, then go straight back there.
  const { step, from, for: forId } = useLocalSearchParams<{ step: string; from?: string; for?: string }>();
  const fromReview = from === 'review';
  const { session, profile: myProfile, refreshProfile } = useSession();
  // ?for= : an agency working on one of its client profiles.
  const [managedProfile, setManagedProfile] = useState<Profile | null>(null);
  const loadManaged = useCallback(async () => {
    if (!forId || !supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', forId).maybeSingle();
    setManagedProfile((data as Profile | null) ?? null);
  }, [forId]);
  useEffect(() => { loadManaged(); }, [loadManaged]);
  const managed = Boolean(forId);
  const profile = managed ? managedProfile : myProfile;
  const profileId = forId ?? session?.user.id;
  const refresh = managed ? loadManaged : refreshProfile;
  /** Keeps ?for= on every link so the agency stays on the client profile. */
  const href = (path: string, extra?: string) => {
    const q = [extra, forId ? `for=${forId}` : ''].filter(Boolean).join('&');
    return q ? `${path}?${q}` : path;
  };
  // Depends on the role only: a profile refresh must not reload (and overwrite) answers being edited.
  const role = profile?.role;
  const steps = useMemo(() => (role ? stepsFor(role, managed) : []), [role, managed]);
  const total = steps.length + FINAL_STEPS.length;

  const index = Number(step);
  const isQuestion = Number.isInteger(index) && index >= 0 && index < steps.length;
  const finalIndex = FINAL_STEPS.indexOf(step as (typeof FINAL_STEPS)[number]);
  const position = isQuestion ? index : steps.length + finalIndex;

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId || steps.length === 0) return;
    loadAnswers(profileId, steps).then((a) => {
      setAnswers(a);
      setLoaded(true);
    });
  }, [profileId, steps]);

  if (!profile || !session || !profileId) return null;

  const goTo = (pos: number) => {
    if (pos < 0) return router.replace(managed ? '/agency' : '/');
    if (pos < steps.length) return router.push(href(`/onboarding/${pos}`));
    const final = FINAL_STEPS[pos - steps.length];
    if (!final) return router.replace(managed ? '/agency' : '/welcome');
    router.push(href(`/onboarding/${final}`));
  };
  const stepProps = { profile, profileId, managed, refresh, href };

  const progress = (
    <Text style={styles.progress}>
      Step {position + 1} of {total}
    </Text>
  );

  if (!isQuestion) {
    if (step === 'photos') return <PhotosStep {...stepProps} header={progress} onBack={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />;
    if (step === 'bio') return <BioStep {...stepProps} header={progress} onBack={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />;
    if (step === 'review') return <ReviewStep {...stepProps} header={progress} onBack={() => goTo(position - 1)} />;
    return (
      <Screen title="Page not found">
        <Button label="Start over" onPress={() => router.replace(href('/onboarding/0'))} />
      </Screen>
    );
  }

  const current = steps[index];

  async function next() {
    const e = validateStep(current, answers);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setServerError('');
    const err = await saveStep(profileId!, current, steps, answers);
    setBusy(false);
    if (err) return setServerError(err);
    await refresh();
    if (fromReview) return router.replace(href('/onboarding/review'));
    goTo(position + 1);
  }

  const set = (key: string, value: unknown) => setAnswers((a) => ({ ...a, [key]: value }));

  return (
    <Screen title={managed ? `${profile.display_name || 'New client'}: ${current.title}` : current.title} intro={current.intro}>
      {progress}
      {current.notice ? <FormMessage kind="info" text={current.notice} /> : null}
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
      {!loaded ? <Text style={styles.loading}>Loading your answers…</Text> : null}
      {current.fields.map((f) => (
        <FieldControl key={f.key} field={f} value={answers[f.key]} onChange={(v) => set(f.key, v)} error={errors[f.key]} />
      ))}
      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={() => goTo(position - 1)} />
        <Button label={busy ? 'Saving…' : fromReview ? 'Save and review' : 'Save and continue'} onPress={next} disabled={busy || !loaded} />
      </View>
      <Text style={styles.saveNote}>{fromReview ? 'Saving takes you back to the review page.' : `Your answers save when you continue. ${position + 1 < total ? 'The review page at the end shows whether your profile is live.' : ''}`}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSubtle, letterSpacing: 0.3 },
  loading: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginTop: space.sm },
  saveNote: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle, textAlign: 'center' },
});
