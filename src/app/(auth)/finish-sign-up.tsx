/**
 * Shown once to a member who signed in with Google or Apple and has no
 * profile yet: pick a role and agree to the terms, then onboarding begins.
 * If they already chose and agreed on the sign-up page, /welcome finishes
 * this automatically and they never see it.
 */
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox, FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { LEGAL_VERSION } from '@/config/settings';
import { type Role, useSession } from '@/lib/auth';
import { privateMeta } from '@/lib/seo';
import { completeAgencySignup, completeSignup, readPendingSignup } from '@/lib/social';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateMetadata() {
  return privateMeta('Finish your account');
}

export default function FinishSignUp() {
  const { loading, session, profile, agency, profileChecked, refreshProfile, signOut } = useSession();
  const [role, setRole] = useState<Role | 'agency' | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [agencyWebsite, setAgencyWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [individualOk, setIndividualOk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    readPendingSignup().then((p) => {
      if (!p) return;
      setRole(p.role);
      setAgencyName(p.agency_name ?? '');
      setAgencyWebsite(p.agency_website ?? '');
      setContactName(p.contact_name ?? '');
    });
  }, []);

  // Already finished (or never started): move along.
  useEffect(() => {
    if (loading || !profileChecked) return;
    if (!session) router.replace('/log-in');
    else if (profile) router.replace('/welcome');
    else if (agency) router.replace('/agency');
  }, [loading, profileChecked, session, profile, agency]);

  const minAge = role === 'surrogate' ? 21 : 18;

  async function submit() {
    const e: Record<string, string> = {};
    const isAgency = role === 'agency';
    if (!role) e.role = 'Please choose one.';
    if (isAgency) {
      if (!agencyName.trim()) e.agencyName = 'Enter your agency name.';
      if (!/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(agencyWebsite.trim())) e.agencyWebsite = 'Enter your website, like www.youragency.com.';
      if (!contactName.trim()) e.contactName = 'Enter your name.';
    } else if (!ageOk) e.age = `Please confirm you are ${minAge} or older.`;
    if (!termsOk) e.terms = 'Please agree to continue.';
    if (!individualOk) e.individual = 'Please confirm to continue.';
    setErrors(e);
    if (Object.keys(e).length || !role) return;
    setBusy(true);
    const err = isAgency
      ? await completeAgencySignup(agencyName.trim(), agencyWebsite.trim(), contactName.trim(), LEGAL_VERSION)
      : await completeSignup(role, LEGAL_VERSION);
    setBusy(false);
    if (err) return setServerError(err);
    await refreshProfile();
    router.replace(isAgency ? '/agency' : '/onboarding/0');
  }

  return (
    <Screen title="One more step" intro={`You're signed in as ${session?.user.email ?? 'your account'}. Tell us who you are and agree to the terms, and your profile is ready to build.`}>
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
      <View style={styles.roles}>
        <RoleCard selected={role === 'surrogate'} title="I'm a surrogate" body="Always free. You must be 21 or older." onPress={() => setRole('surrogate')} />
        <RoleCard selected={role === 'intended_parent'} title="We're intended parents" body="Free to join and browse. You must be 18 or older." onPress={() => setRole('intended_parent')} />
        <RoleCard selected={role === 'agency'} title="We're an agency" body="Post profiles for the clients you represent. Approved by hand." onPress={() => setRole('agency')} />
      </View>
      {errors.role ? <Text style={styles.error}>{errors.role}</Text> : null}
      <Text style={styles.note}>You can't change this later, so pick carefully.</Text>
      {role === 'agency' ? (
        <>
          <TextField label="Agency name" required value={agencyName} onChangeText={setAgencyName} error={errors.agencyName} maxLength={80} />
          <TextField label="Agency website" required value={agencyWebsite} onChangeText={setAgencyWebsite} error={errors.agencyWebsite} placeholder="https://www.youragency.com" autoCapitalize="none" keyboardType="url" maxLength={200} />
          <TextField label="Your name" required value={contactName} onChangeText={setContactName} error={errors.contactName} maxLength={80} />
        </>
      ) : (
        <Checkbox checked={ageOk} onChange={setAgeOk} error={errors.age} label={`I am ${minAge} years of age or older.`} />
      )}
      <Checkbox
        checked={termsOk}
        onChange={setTermsOk}
        error={errors.terms}
        label={
          <Text>
            I agree to the <Link href="/terms" style={styles.link}>Terms of Service</Link>,{' '}
            <Link href="/privacy" style={styles.link}>Privacy Policy</Link> and{' '}
            <Link href="/disclaimer" style={styles.link}>Disclaimer</Link>. I understand that Independent Journey is not an agency, law firm or
            medical provider and gives no advice, and that messages may be reviewed by the safety team to protect members from fraud and abuse.
          </Text>
        }
      />
      <Checkbox
        checked={individualOk}
        onChange={setIndividualOk}
        error={errors.individual}
        label={role === 'agency'
          ? 'I am authorized to act for this agency. We will only post profiles for clients who have given us written consent to be listed, and every profile we post will be labelled as an agency profile.'
          : 'I am an individual joining for my own journey. I am not an agency, broker, recruiter or business.'}
      />
      <Button label={busy ? 'Setting up…' : 'Finish creating my account'} onPress={submit} disabled={busy} />
      <Text style={styles.footer}>
        Changed your mind?{' '}
        <Text style={styles.link} onPress={() => signOut().then(() => router.replace('/'))}>Sign out</Text>
      </Text>
    </Screen>
  );
}

function RoleCard({ selected, title, body, onPress }: { selected: boolean; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.card, selected && styles.cardSelected]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roles: { gap: space.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: 4 },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSoft },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  cardBody: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger },
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
