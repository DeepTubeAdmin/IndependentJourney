/**
 * Sign-up with email and password.
 *
 * Collects: email, password, age confirmation, agreement to Terms, Privacy
 * Policy and disclaimer, the message-review notice, and the "I am an
 * individual, not an agency" attestation. The role comes from the Join screen.
 *
 * Google and Apple sign-in: the agreement boxes must be ticked first; the
 * role and agreement are remembered so /welcome can finish the account after
 * the redirect (see src/lib/social.ts).
 */
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox, FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { SocialButtons } from '@/components/SocialButtons';
import { LEGAL_VERSION } from '@/config/settings';
import { friendlyAuthError, type Role } from '@/lib/auth';
import { rememberPendingSignup } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Create Your Free Profile',
    description:
      'Sign up as a gestational surrogate, intended parent or agency. Free for surrogates, no match fees, and every profile is labelled independent or agency.',
    path: '/sign-up',
  });
}

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: string }>();
  const isAgency = params.role === 'agency';
  const role: Role = params.role === 'surrogate' ? 'surrogate' : 'intended_parent';
  const minAge = role === 'surrogate' ? 21 : 18;
  // Agency sign-up asks for the business basics up front; details come after.
  const [agencyName, setAgencyName] = useState('');
  const [agencyWebsite, setAgencyWebsite] = useState('');
  const [contactName, setContactName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [individualOk, setIndividualOk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  /** The three agreement boxes, shared by email and social sign-up. */
  function agreementErrors() {
    const e: Record<string, string> = {};
    if (isAgency) {
      if (!agencyName.trim()) e.agencyName = 'Enter your agency name.';
      if (!/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(agencyWebsite.trim())) e.agencyWebsite = 'Enter your website, like www.youragency.com.';
      if (!contactName.trim()) e.contactName = 'Enter your name.';
      if (!termsOk) e.terms = 'Please agree to continue.';
      if (!individualOk) e.individual = 'Please confirm to continue.';
      return e;
    }
    if (!ageOk) e.age = `Please confirm you are ${minAge} or older.`;
    if (!termsOk) e.terms = 'Please agree to continue.';
    if (!individualOk) e.individual = 'Please confirm to continue.';
    return e;
  }

  // Google / Apple: agreement first, then remember the choice for /welcome.
  async function beforeSocial() {
    const e = agreementErrors();
    setErrors(e);
    if (Object.keys(e).length) {
      setServerError('Please tick the three boxes above first, then continue with Google or Apple.');
      return false;
    }
    setServerError('');
    await rememberPendingSignup(
      isAgency
        ? { role: 'agency', legal_version: LEGAL_VERSION, agreed: true, agency_name: agencyName.trim(), agency_website: agencyWebsite.trim(), contact_name: contactName.trim() }
        : { role, legal_version: LEGAL_VERSION, agreed: true },
    );
    return true;
  }

  async function submit() {
    const e: Record<string, string> = agreementErrors();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!supabase) {
      setServerError('The app is not connected to a database yet.');
      return;
    }
    setBusy(true);
    setServerError('');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: isAgency
          ? { role: 'agency', agency_name: agencyName.trim(), agency_website: agencyWebsite.trim(), contact_name: contactName.trim(), legal_version: LEGAL_VERSION }
          : { role, attested_individual: true, attested_age: true, legal_version: LEGAL_VERSION },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/welcome` : undefined,
      },
    });
    setBusy(false);
    if (error) {
      setServerError(friendlyAuthError(error.message));
      return;
    }
    // With email confirmation on, there is no session yet: send them to check their inbox.
    router.replace({ pathname: '/verify-email', params: { email: email.trim().toLowerCase(), pending: data.session ? '0' : '1' } });
  }

  return (
    <Screen
      title={isAgency ? 'Create your agency account' : role === 'surrogate' ? 'Create your free surrogate account' : 'Create your intended parent account'}
      intro={isAgency ? 'Free during our beta. We approve each agency by hand, usually within a day or two, and email you when you can start posting client profiles.' : "Your email and password are private. Next you'll build your profile."}
    >
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
      {isAgency ? (
        <>
          <TextField label="Agency name" required value={agencyName} onChangeText={setAgencyName} error={errors.agencyName} maxLength={80} />
          <TextField label="Agency website" required value={agencyWebsite} onChangeText={setAgencyWebsite} error={errors.agencyWebsite} placeholder="https://www.youragency.com" autoCapitalize="none" keyboardType="url" maxLength={200} />
          <TextField label="Your name" required help="The person we talk to about this account." value={contactName} onChangeText={setContactName} error={errors.contactName} maxLength={80} />
        </>
      ) : null}
      <TextField
        label="Email"
        required
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        required
        help="At least 8 characters."
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {!isAgency ? <Checkbox checked={ageOk} onChange={setAgeOk} error={errors.age} label={`I am ${minAge} years of age or older.`} /> : null}
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
        label={isAgency
          ? 'I am authorized to act for this agency. We will only post profiles for clients who have given us written consent to be listed, and every profile we post will be labelled as an agency profile.'
          : 'I am an individual joining for my own journey. I am not an agency, broker, recruiter or business.'}
      />
      <Button label={busy ? 'Creating your account…' : 'Create account'} onPress={submit} disabled={busy} />
      <SocialButtons onBeforeStart={beforeSocial} ready={(isAgency || ageOk) && termsOk && individualOk} caption="Or, after ticking the boxes above, continue with" />
      <Text style={styles.footer}>
        Already have an account?{' '}
        <Link href="/log-in" style={styles.link}>
          Log in
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodyBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
