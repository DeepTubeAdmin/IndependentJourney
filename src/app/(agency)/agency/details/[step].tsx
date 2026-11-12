/**
 * Agency details, one screen per step (src/config/questionnaire.ts AGENCY_STEPS).
 * URL: /agency/details/0 … /agency/details/3. Answers save on "Save and continue";
 * the database marks the agency complete when the required answers are in.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { FieldControl } from '@/components/onboarding/FieldControl';
import { Screen } from '@/components/Screen';
import { AGENCY_STEPS } from '@/config/questionnaire';
import { useSession } from '@/lib/auth';
import { loadAnswers, saveStep, validateStep, type Answers } from '@/lib/profile';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Agency details');
}

export default function AgencyDetailsStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const { session, refreshProfile } = useSession();
  const index = Number(step);
  const current = AGENCY_STEPS[index];
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    loadAnswers(session.user.id, AGENCY_STEPS).then((a) => { setAnswers(a); setLoaded(true); });
  }, [session]);

  if (!session) return null;
  if (!current) {
    return (
      <Screen title="Page not found">
        <Button label="Back to dashboard" onPress={() => router.replace('/agency')} />
      </Screen>
    );
  }

  async function next() {
    const e = validateStep(current, answers);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setServerError('');
    const err = await saveStep(session!.user.id, current, AGENCY_STEPS, answers);
    setBusy(false);
    if (err) return setServerError(err);
    await refreshProfile();
    if (index + 1 < AGENCY_STEPS.length) router.push(`/agency/details/${index + 1}`);
    else router.replace('/agency');
  }

  const set = (key: string, value: unknown) => setAnswers((a) => ({ ...a, [key]: value }));

  return (
    <Screen title={current.title} intro={current.intro}>
      <Text style={styles.progress}>Step {index + 1} of {AGENCY_STEPS.length}</Text>
      {current.notice ? <FormMessage kind="info" text={current.notice} /> : null}
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
      {!loaded ? <Text style={styles.loading}>Loading…</Text> : null}
      {current.fields.map((f) => (
        <FieldControl key={f.key} field={f} value={answers[f.key]} onChange={(v) => set(f.key, v)} error={errors[f.key]} />
      ))}
      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={() => (index === 0 ? router.replace('/agency') : router.push(`/agency/details/${index - 1}`))} />
        <Button label={busy ? 'Saving…' : index + 1 < AGENCY_STEPS.length ? 'Save and continue' : 'Save and finish'} onPress={next} disabled={busy || !loaded} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSubtle, letterSpacing: 0.3 },
  loading: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginTop: space.sm },
});
