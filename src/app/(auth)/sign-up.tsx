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
      'Sign up as a gestational surrogate or intended parent and start your independent surrogacy journey. Free for surrogates, no agency fees, no match fees.',
    path: '/sign-up',
  });
}

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === 'surrogate' ? 'surrogate' : 'intended_parent';
  const minAge = role === 'surrogate' ? 21 : 18;

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
    await rememberPendingSignup({ role, legal_version: LEGAL_VERSION, agreed: true });
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
        data: { role, attested_individual: true, attested_age: true, legal_version: LEGAL_VERSION },
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
      title={role === 'surrogate' ? 'Create your free surrogate account' : 'Create your intended parent account'}
      intro="Your email and password are private. Next you'll build your profile."
    >
      {serverError ? <FormMessage kind="error" text={serverError} /> : null}
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
      <Checkbox checked={ageOk} onChange={setAgeOk} error={errors.age} label={`I am ${minAge} years of age or older.`} />
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
        label="I am an individual joining for my own journey. I am not an agency, broker, recruiter or business."
      />
      <Button label={busy ? 'Creating your account…' : 'Create account'} onPress={submit} disabled={busy} />
      <SocialButtons onBeforeStart={beforeSocial} ready={ageOk && termsOk && individualOk} caption="Or, after ticking the boxes above, continue with" />
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
