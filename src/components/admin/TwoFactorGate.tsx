/**
 * Two-factor authentication for admins, using any authenticator app
 * (Google Authenticator, 1Password, Authy...).
 *  - First time: shows a QR code to scan, then asks for the 6-digit code.
 *  - Later: just asks for the current 6-digit code.
 */
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { mfa } from '@/lib/admin';
import { colors, fonts, radius, space } from '@/lib/theme';

export function TwoFactorGate({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'enroll' | 'verify'>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await mfa.status();
      if (s.enrolled && s.factorId) {
        setFactorId(s.factorId);
        setPhase('verify');
      } else {
        const r = await mfa.enroll();
        if ('error' in r) return setError(r.error);
        setFactorId(r.factorId);
        setQr(r.qr);
        setSecret(r.secret);
        setPhase('enroll');
      }
    })();
  }, []);

  async function submit() {
    if (!factorId) return;
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setError('');
    const err = await mfa.verify(factorId, code);
    setBusy(false);
    if (err) return setError(err);
    onDone();
  }

  return (
    <Screen
      title={phase === 'enroll' ? 'Set up two-factor authentication' : 'Confirm it’s you'}
      intro={
        phase === 'enroll'
          ? 'Admin access requires an authenticator app. Scan this code with Google Authenticator, 1Password, Authy or a similar app, then enter the 6-digit code it shows.'
          : 'Open your authenticator app and enter the current 6-digit code for Independent Journey admin.'
      }
    >
      {error ? <FormMessage kind="error" text={error} /> : null}
      {phase === 'loading' ? <Text style={styles.note}>Preparing…</Text> : null}
      {phase === 'enroll' ? (
        <View style={styles.qrWrap}>
          {qr ? <Image source={{ uri: qr }} style={styles.qr} accessibilityLabel="QR code for your authenticator app" /> : null}
          <Text style={styles.note}>Can’t scan? Enter this key by hand:</Text>
          <Text selectable style={styles.secret}>
            {secret}
          </Text>
        </View>
      ) : null}
      {phase !== 'loading' ? (
        <>
          <TextField label="6-digit code" required value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus />
          <Button label={busy ? 'Checking…' : 'Confirm'} onPress={submit} disabled={busy} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrWrap: { alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  qr: { width: 220, height: 220 },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
  secret: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, letterSpacing: 1, textAlign: 'center' },
});
