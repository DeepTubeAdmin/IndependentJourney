/**
 * Membership page for intended parents: what the membership includes, the
 * price from settings, honest disclosure before checkout, and current status.
 * Surrogates who land here are told they are free.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { formatDate, formatUsd, myMembership, startCheckout, type Membership } from '@/lib/membership';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Membership');
}

export default function MembershipPage() {
  const { profile } = useSession();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [m, setM] = useState<Membership | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  // After Stripe sends the member back, the webhook may take a few seconds:
  // poll until the membership shows up (or give up after about 30 seconds).
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const r = await myMembership();
      setM(r);
      if (status === 'success' && !r?.active && tries++ < 10) timer = setTimeout(check, 3000);
    };
    check();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  if (!profile) return null;
  if (profile.role === 'surrogate') {
    return (
      <Screen width={640} title="Membership" intro="Surrogates never pay. Your account is free, always.">
        <Button label="Back to home" variant="secondary" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  const price = m ? formatUsd(m.price_usd) : '…';
  const term = m?.term_months ?? 3;

  async function buy() {
    setBusy(true);
    const r = await startCheckout();
    if (r.error) {
      setMsg({ kind: 'error', text: r.error });
      setBusy(false);
    }
  }

  return (
    <Screen width={640} title="Membership" intro={`${price} for ${term} months. One payment, no automatic renewal.`}>
      {status === 'success' && !m?.active ? <FormMessage kind="info" text="Thank you. Your payment is confirmed and your membership is being activated. This page updates by itself." /> : null}
      {status === 'cancelled' ? <FormMessage kind="info" text="Checkout was cancelled. Nothing was charged." /> : null}
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}

      {m?.active ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your membership is active</Text>
          <Text style={styles.text}>It runs until {formatDate(m.current_period_end)}. Renewing before then adds another {term} months on top, so you never lose days.</Text>
          <View style={styles.row}>
            <Button label="Browse surrogates" onPress={() => router.push('/browse')} />
            <Button label={`Renew now for ${price}`} variant="secondary" onPress={buy} disabled={busy} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What membership includes</Text>
            <Text style={styles.item}>• Full surrogate profiles with every photo and answer</Text>
            <Text style={styles.item}>• Send and read messages, including any that are waiting for you now</Text>
            <Text style={styles.item}>• Saved-search alerts when new surrogates match (coming soon)</Text>
            <Text style={styles.item}>• Priority safety review of anyone you report</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Please read before you pay</Text>
            <Text style={styles.item}>• {price} is a one-time charge for {term} months. It does not renew by itself; we will email you before it ends.</Text>
            <Text style={styles.item}>• When it ends you keep your account, profile and conversations. Messages lock again until you renew.</Text>
            <Text style={styles.item}>• We introduce people. We do not screen surrogates medically, guarantee a match, or handle surrogacy payments. Your clinic and attorneys do that.</Text>
            <Text style={styles.item}>• Never send money to anyone you meet here. Compensation goes through an attorney-managed escrow after a signed contract.</Text>
            <Text style={styles.item}>• Payments are handled by Stripe on a secure page. We never see your card number.</Text>
          </View>
          {m?.status === 'lapsed' || m?.status === 'cancelled' ? (
            <FormMessage kind="info" text={`Your previous membership ended on ${formatDate(m.current_period_end)}. Your conversations are saved and unlock as soon as you renew.`} />
          ) : null}
          <Button label={busy ? 'Opening secure checkout…' : `Continue to secure checkout · ${price}`} onPress={buy} disabled={busy || !m} />
          <Text style={styles.fine}>By continuing you agree to our Terms of Use. Refund requests: email support within 7 days if you have not opened a full profile or sent a message.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 4 },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  item: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSubtle },
});
