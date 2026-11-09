/**
 * One onboarding screen. The questionnaire steps come from
 * src/config/questionnaire.ts; after them come photos, bio and review.
 *
 * URL: /onboarding/0, /onboarding/1, ... then /onboarding/photos, /onboarding/bio, /onboarding/review
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChoiceField, FormMessage, MultiChoiceField, SelectField, TextField, YesNoField } from '@/components/form';
import { BioStep } from '@/components/onboarding/BioStep';
import { PhotosStep } from '@/components/onboarding/PhotosStep';
import { ReviewStep } from '@/components/onboarding/ReviewStep';
import { Screen } from '@/components/Screen';
import { FINAL_STEPS, stepsFor, US_STATES, type Field } from '@/config/questionnaire';
import { useSession } from '@/lib/auth';
import { loadAnswers, saveStep, validateStep, type Answers } from '@/lib/profile';
import { colors, fonts, space } from '@/lib/theme';

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const { session, profile, refreshProfile } = useSession();
  const steps = useMemo(() => (profile ? stepsFor(profile.role) : []), [profile]);
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
    if (!session || steps.length === 0) return;
    loadAnswers(session.user.id, steps).then((a) => {
      setAnswers(a);
      setLoaded(true);
    });
  }, [session, steps]);

  if (!profile || !session) return null;

  const goTo = (pos: number) => {
    if (pos < 0) return router.replace('/');
    if (pos < steps.length) return router.push(`/onboarding/${pos}`);
    const final = FINAL_STEPS[pos - steps.length];
    if (!final) return router.replace('/welcome');
    router.push(`/onboarding/${final}`);
  };

  const progress = (
    <Text style={styles.progress}>
      Step {position + 1} of {total}
    </Text>
  );

  if (!isQuestion) {
    if (step === 'photos') return <PhotosStep header={progress} onBack={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />;
    if (step === 'bio') return <BioStep header={progress} onBack={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />;
    if (step === 'review') return <ReviewStep header={progress} onBack={() => goTo(position - 1)} />;
    return (
      <Screen title="Page not found">
        <Button label="Start over" onPress={() => router.replace('/onboarding/0')} />
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
    const err = await saveStep(session!.user.id, current, steps, answers);
    setBusy(false);
    if (err) return setServerError(err);
    await refreshProfile();
    goTo(position + 1);
  }

  const set = (key: string, value: unknown) => setAnswers((a) => ({ ...a, [key]: value }));

  return (
    <Screen title={current.title} intro={current.intro}>
      {progress}
      {current.notice ? <FormMessage kind="info" text={current.notice} /> : null}
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
      {!loaded ? <Text style={styles.loading}>Loading your answers…</Text> : null}
      {current.fields.map((f) => (
        <FieldControl key={f.key} field={f} value={answers[f.key]} onChange={(v) => set(f.key, v)} error={errors[f.key]} />
      ))}
      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={() => goTo(position - 1)} />
        <Button label={busy ? 'Saving…' : 'Save and continue'} onPress={next} disabled={busy || !loaded} />
      </View>
      <Text style={styles.saveNote}>Your answers save when you continue. You can come back and change them any time.</Text>
    </Screen>
  );
}

function FieldControl({ field, value, onChange, error }: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const common = { label: field.label, help: field.help, required: field.required, error };
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'number':
    case 'date':
      return (
        <TextField
          {...common}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          multiline={field.type === 'textarea'}
          placeholder={field.placeholder ?? (field.type === 'date' ? 'YYYY-MM-DD' : undefined)}
          keyboardType={field.type === 'number' ? 'number-pad' : field.type === 'date' ? 'numbers-and-punctuation' : 'default'}
          maxLength={field.maxLength}
        />
      );
    case 'state':
      return <SelectField {...common} options={US_STATES} value={(value as string) ?? null} onChange={onChange} />;
    case 'single':
      return <ChoiceField {...common} options={field.options ?? []} value={value == null ? null : String(value)} onChange={onChange} />;
    case 'multi':
      return <MultiChoiceField {...common} options={field.options ?? []} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'yesno':
      return <YesNoField {...common} value={typeof value === 'boolean' ? value : null} onChange={onChange} />;
  }
}

const styles = StyleSheet.create({
  progress: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSubtle, letterSpacing: 0.3 },
  loading: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginTop: space.sm },
  saveNote: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle, textAlign: 'center' },
});
