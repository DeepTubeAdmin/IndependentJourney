/** Account settings: email, password reset, email preferences, saved searches, sign out, and how to delete the account. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox, FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import {
  NOTIFICATION_LABELS, type NotificationSettings, type SavedSearch,
  deleteSearch, describeFilters, listSavedSearches, myNotificationSettings, saveNotificationSettings, setSearchAlerts,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function Settings() {
  const { session, profile, signOut } = useSession();
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [prefs, setPrefs] = useState<NotificationSettings | null>(null);
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    if (!session) return;
    myNotificationSettings().then(setPrefs);
    listSavedSearches().then(setSearches);
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || !profile) return null;

  // Each checkbox saves straight away; no separate Save button to forget.
  async function togglePref(key: keyof NotificationSettings, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const err = await saveNotificationSettings(next);
    if (err) setMsg({ kind: 'error', text: err });
  }

  async function sendReset() {
    if (!supabase || !session?.user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, { redirectTo: `${SITE.url}/reset-password` });
    setMsg(error ? { kind: 'error', text: error.message } : { kind: 'info', text: `We emailed a password reset link to ${session.user.email}.` });
  }

  return (
    <Screen width={640} title="Settings" intro="Your account details and controls.">
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Row k="Email" v={session.user.email ?? ''} />
        <Row k="Account type" v={profile.role === 'surrogate' ? 'Surrogate (free)' : 'Intended parent'} />
        <Row k="Identity" v={profile.is_verified ? 'Verified' : 'Not verified'} />
        <View style={styles.row}>
          <Button label="Change password" variant="secondary" size="sm" onPress={sendReset} />
          <Button label="Edit my profile" variant="secondary" size="sm" onPress={() => router.push('/onboarding/review')} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.text}>Who sees your limited preview is set on the “In your own words” step of your profile. Blocked members are managed from inside a conversation.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email me about</Text>
        <Text style={styles.text}>Account and security emails (password resets, ID-check results) are always sent.</Text>
        {prefs
          ? NOTIFICATION_LABELS.map((n) => (
              <Checkbox key={n.key} label={<Text><Text style={styles.v}>{n.label}</Text><Text style={styles.help}>{`  ${n.help}`}</Text></Text>} checked={prefs[n.key]} onChange={(v) => togglePref(n.key, v)} />
            ))
          : <Text style={styles.text}>Loading…</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved searches</Text>
        {searches.length === 0 ? (
          <Text style={styles.text}>None yet. On the Browse page, set some filters and click “Save this search” to get an email when new profiles match.</Text>
        ) : (
          searches.map((sv) => (
            <View key={sv.id} style={styles.search}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.v}>{sv.name}</Text>
                <Text style={styles.help}>{describeFilters(sv.filters)}</Text>
              </View>
              <Checkbox label="Email alerts" checked={sv.alerts} onChange={async (v) => { await setSearchAlerts(sv.id, v); setSearches((all) => all.map((x) => (x.id === sv.id ? { ...x, alerts: v } : x))); }} />
              <Button label="Delete" variant="secondary" size="sm" onPress={async () => { await deleteSearch(sv.id); setSearches((all) => all.filter((x) => x.id !== sv.id)); }} />
            </View>
          ))
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delete your account</Text>
        <Text style={styles.text}>Email privacy@{SITE.domain.toLowerCase()} from your account email and we will remove your profile, photos and answers. Self-service deletion arrives in a coming update.</Text>
      </View>
      <Button label="Sign out" variant="secondary" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  row: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  k: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSubtle, minWidth: 120 },
  v: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1 },
  help: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  search: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.xs, borderTopWidth: 1, borderTopColor: colors.border },
});
