/**
 * Agency dashboard: approval status, agency details and logo, and the client
 * profiles the agency has posted. Each client profile is edited through the
 * same onboarding screens members use, with ?for=<profile id>.
 */
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { createClientProfile, deleteClientProfile, logoUrl, myAgency, removeLogo, uploadLogo, type AgencyClient, type MyAgency } from '@/lib/agency';
import { useSession } from '@/lib/auth';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Agency dashboard');
}

export default function AgencyHome() {
  const { refreshProfile } = useSession();
  const [data, setData] = useState<MyAgency | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await myAgency());
  }, []);
  // Reload whenever the dashboard comes back into view (after editing a client, for example).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <Screen width={880} title="Agency dashboard"><Text style={styles.note}>Loading…</Text></Screen>;

  const approved = data.status === 'approved';
  const canAdd = approved && data.is_complete && data.has_access;

  async function add(role: 'surrogate' | 'intended_parent') {
    setBusy(true);
    setError('');
    const r = await createClientProfile(role);
    setBusy(false);
    if (r.error) return setError(r.error);
    router.push(`/onboarding/0?for=${r.id}`);
  }

  async function remove(id: string) {
    setBusy(true);
    const err = await deleteClientProfile(id);
    setBusy(false);
    setConfirmRemove(null);
    if (err) return setError(err);
    await load();
  }

  async function pickLogo() {
    if (!data) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('We need permission to open your pictures.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    const err = await uploadLogo(data.id, result.assets[0].uri);
    setBusy(false);
    if (err) return setError(err);
    await load();
    await refreshProfile();
  }

  return (
    <Screen width={880} title={data.name || 'Agency dashboard'} intro="Your agency account. Post and manage profiles for the clients you represent.">
      {error ? <FormMessage kind="error" text={error} /> : null}
      <StatusBanner data={data} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Agency details</Text>
        <Text style={styles.note}>{data.is_complete ? 'Complete. Your name, website, location, services and fee ranges are shown on each client profile.' : 'Not finished yet. Members see these details on every profile you post, and we use them to review your account.'}</Text>
        <View style={styles.row}>
          <Button label={data.is_complete ? 'Edit agency details' : 'Finish agency details'} variant={data.is_complete ? 'secondary' : 'primary'} onPress={() => router.push('/agency/details/0')} />
        </View>
        <View style={styles.logoRow}>
          {data.logo_path ? <Image source={{ uri: logoUrl(data.logo_path) }} style={styles.logo} accessibilityLabel={`${data.name} logo`} /> : <View style={[styles.logo, styles.logoEmpty]}><Text style={styles.logoEmptyText}>No logo</Text></View>}
          <View style={{ gap: space.xs }}>
            <Button label={data.logo_path ? 'Change logo' : 'Add logo (optional)'} variant="secondary" size="sm" onPress={pickLogo} disabled={busy} />
            {data.logo_path ? <Button label="Remove logo" variant="secondary" size="sm" onPress={async () => { await removeLogo(data.id, data.logo_path); await load(); }} disabled={busy} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Client profiles</Text>
        <Text style={styles.note}>
          Each profile uses the same questionnaire as independent members and is labelled with your agency name. Only post a client who has agreed in writing to be listed. Health questions are skipped; we ask about OB and clinic clearance instead.
        </Text>
        <View style={styles.row}>
          <Button label="Add a surrogate" onPress={() => add('surrogate')} disabled={!canAdd || busy} />
          <Button label="Add intended parents" onPress={() => add('intended_parent')} disabled={!canAdd || busy} />
          <Button label="Messages" variant="secondary" onPress={() => router.push('/messages')} />
        </View>
        {!canAdd ? <Text style={styles.hint}>{!approved ? 'You can add profiles once your agency is approved.' : !data.is_complete ? 'Finish your agency details to add profiles.' : 'An agency subscription is needed to add profiles.'}</Text> : null}
        {data.profiles.length === 0 ? <Text style={styles.note}>No client profiles yet.</Text> : null}
        {data.profiles.map((c) => (
          <ClientRow key={c.id} c={c} busy={busy} confirming={confirmRemove === c.id} onConfirm={() => setConfirmRemove(confirmRemove === c.id ? null : c.id)} onRemove={() => remove(c.id)} />
        ))}
      </View>

      <Text style={styles.fine}>
        Independent Journey is an introduction platform. We do not screen, match or manage journeys, and we are not a party to any agreement between you, your clients and other members. Details you give about fees and services are shown as your own statements.
      </Text>
    </Screen>
  );
}

function StatusBanner({ data }: { data: MyAgency }) {
  if (data.status === 'approved') return <FormMessage kind="info" text={`Approved. ${data.pricing_mode === 'free' ? 'Agency accounts are free during our beta; we will give notice before any pricing starts.' : ''}`} />;
  if (data.status === 'pending') return <FormMessage kind="info" text={data.is_complete ? 'Your agency is waiting for review. We check every agency by hand and email you when it is approved, usually within a few days.' : 'Welcome. Finish your agency details below so we can review your account. We approve every agency by hand.'} />;
  if (data.status === 'rejected') return <FormMessage kind="error" text={`We were not able to approve your agency.${data.review_note ? ` Reason: ${data.review_note}` : ''} Reply to our email if you think this is a mistake.`} />;
  return <FormMessage kind="error" text={`Your agency account is suspended and your client profiles are hidden.${data.review_note ? ` Reason: ${data.review_note}` : ''}`} />;
}

function ClientRow({ c, busy, confirming, onConfirm, onRemove }: { c: AgencyClient; busy: boolean; confirming: boolean; onConfirm: () => void; onRemove: () => void }) {
  const roleLabel = c.role === 'surrogate' ? 'Surrogate' : 'Intended parents';
  return (
    <View style={styles.client}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.clientName}>{c.display_name || 'New profile (no name yet)'}{c.state ? ` · ${c.state}` : ''}</Text>
        <Text style={styles.clientMeta}>
          {roleLabel} · {c.is_complete ? 'Live' : 'Not live yet: finish the questionnaire'}{c.unread > 0 ? ` · ${c.unread} unread message${c.unread === 1 ? '' : 's'}` : ''}
        </Text>
      </View>
      <View style={styles.clientBtns}>
        <Button label={c.is_complete ? 'Edit' : 'Continue'} size="sm" variant={c.is_complete ? 'secondary' : 'primary'} onPress={() => router.push(c.is_complete ? `/onboarding/review?for=${c.id}` : `/onboarding/0?for=${c.id}`)} />
        {c.is_complete ? <Button label="View" size="sm" variant="secondary" onPress={() => router.push(`/profile/${c.id}`)} /> : null}
        <Button label={confirming ? 'Cancel' : 'Remove'} size="sm" variant="secondary" onPress={onConfirm} disabled={busy} />
      </View>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.note}>Remove this profile for good, with its photos and conversations? This cannot be undone.</Text>
          <Button label="Yes, remove it" size="sm" onPress={onRemove} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  hint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSubtle },
  fine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textSubtle },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  logo: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceSoft, resizeMode: 'contain' },
  logoEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  logoEmptyText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSubtle },
  client: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  clientName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  clientMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  clientBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  confirm: { width: '100%', gap: space.xs, backgroundColor: colors.surfaceSoft, borderRadius: radius.md, padding: space.sm },
});
