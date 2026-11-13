/**
 * Admin: agencies waiting for approval, approved, rejected and suspended.
 * Tap a row to open it; approve, reject or suspend with a note the agency sees.
 */
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AdminShell, KV, Panel } from '@/components/admin/AdminShell';
import { Pill, Table } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { ChoiceField, FormMessage, TextField } from '@/components/form';
import { admin, useAdminData, type AgencyRow } from '@/lib/admin';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin agencies');
}

const TONE = { pending: 'warn', approved: 'good', rejected: 'bad', suspended: 'bad' } as const;
const SKIP = new Set(['id', 'name', 'website', 'contact_name', 'email', 'status', 'review_note', 'reviewed_at', 'reviewed_by', 'profiles', 'is_complete', 'created_at', 'updated_at', 'logo_path', 'paid_until', 'attested_consent']);

export default function Agencies() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [status, setStatus] = useState<string | null>('pending');
  const [tick, setTick] = useState(0);
  const { data, error, loading } = useAdminData(() => admin.listAgencies(status), [status, tick]);
  const { data: detail, error: detailError } = useAdminData(() => (id ? admin.agencyDetail(id) : Promise.resolve({ data: null, error: null })), [id, tick]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(next: 'approved' | 'rejected' | 'suspended' | 'pending') {
    if (!id) return;
    if ((next === 'rejected' || next === 'suspended') && !note.trim()) return setMsg({ kind: 'error', text: 'Add a short note first. The agency sees it.' });
    setBusy(true);
    const { error: e } = await admin.setAgencyStatus(id, next, note.trim());
    setBusy(false);
    setMsg(e ? { kind: 'error', text: e } : { kind: 'info', text: `Agency marked ${next}. ${next === 'approved' || next === 'rejected' || next === 'suspended' ? 'They have been emailed.' : ''}` });
    if (!e) { setNote(''); setTick((t) => t + 1); }
  }

  return (
    <AdminShell title="Agencies" intro="Every agency is approved by hand. Check the website, then approve or reject. Suspending hides all of an agency’s client profiles.">
      <ChoiceField
        label="Show"
        options={[{ value: 'pending', label: 'Waiting for approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'suspended', label: 'Suspended' }, { value: 'all', label: 'All' }]}
        value={status ?? 'all'}
        onChange={(v) => setStatus(v === 'all' ? null : (v as string))}
      />
      {error ? <FormMessage kind="error" text={error} /> : null}
      {loading ? <Text style={styles.note}>Loading…</Text> : null}
      <Table<AgencyRow>
        rows={data ?? []}
        keyOf={(a) => a.id}
        onPress={(a) => { setMsg(null); router.setParams({ id: a.id }); }}
        cols={[
          { key: 'name', label: 'Agency', flex: 2, render: (a) => a.name || '(no name yet)' },
          { key: 'contact', label: 'Contact', flex: 2, render: (a) => `${a.contact_name}\n${a.email}` },
          { key: 'state', label: 'HQ', render: (a) => a.hq_state || '—' },
          { key: 'profiles', label: 'Profiles', render: (a) => String(a.profile_count) },
          { key: 'details', label: 'Details', render: (a) => (a.is_complete ? 'Complete' : 'Incomplete') },
          { key: 'status', label: 'Status', render: (a) => <Pill text={a.status} tone={TONE[a.status]} /> },
          { key: 'joined', label: 'Signed up', render: (a) => new Date(a.created_at).toLocaleDateString('en-US') },
        ]}
        empty="No agencies here."
      />

      {id ? (
        <Panel title={detail ? `${detail.name || 'Agency'} · ${detail.status}` : 'Agency'}>
          {detailError ? <FormMessage kind="error" text={detailError} /> : null}
          {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}
          {detail ? (
            <>
              <KV k="Website" v={detail.website ? <Text style={styles.link} onPress={() => Linking.openURL(/^https?:\/\//i.test(detail.website) ? detail.website : `https://${detail.website}`)}>{detail.website}</Text> : ''} />
              <KV k="Contact" v={`${detail.contact_name || '—'} · ${detail.email}${detail.contact_phone ? ` · ${detail.contact_phone}` : ''}`} />
              <KV k="Details complete" v={detail.is_complete ? 'Yes' : 'No'} />
              <KV k="Consent attested" v={detail.attested_consent ? 'Yes' : 'No'} />
              <KV k="Signed up" v={new Date(detail.created_at).toLocaleString('en-US')} />
              {detail.review_note ? <KV k="Last review note" v={detail.review_note} /> : null}
              {Object.entries(detail)
                .filter(([k, v]) => !SKIP.has(k) && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
                .map(([k, v]) => <KV key={k} k={k.replace(/_/g, ' ')} v={Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)} />)}
              <Text style={styles.sub}>Client profiles ({(detail.profiles ?? []).length})</Text>
              {(detail.profiles ?? []).map((p: any) => (
                <Text key={p.id} style={styles.note} onPress={() => router.push(`/admin/member/${p.id}`)}>
                  {p.display_name || '(no name)'} · {p.role === 'surrogate' ? 'Surrogate' : 'Intended parents'} · {p.state || '—'} · {p.is_complete ? 'live' : 'incomplete'}
                </Text>
              ))}
              <TextField label="Note to the agency (required for reject or suspend)" value={note} onChangeText={setNote} multiline placeholder="e.g. We could not find your agency at the website given." />
              <View style={styles.actions}>
                {detail.status !== 'approved' ? <Button label="Approve" onPress={() => act('approved')} disabled={busy} /> : null}
                {detail.status === 'pending' ? <Button label="Reject" variant="secondary" onPress={() => act('rejected')} disabled={busy} /> : null}
                {detail.status === 'approved' ? <Button label="Suspend" variant="secondary" onPress={() => act('suspended')} disabled={busy} /> : null}
                {detail.status === 'rejected' || detail.status === 'suspended' ? <Button label="Back to pending" variant="secondary" onPress={() => act('pending')} disabled={busy} /> : null}
                <Button label="Close" variant="secondary" onPress={() => router.setParams({ id: undefined })} />
              </View>
            </>
          ) : (
            <Text style={styles.note}>Loading…</Text>
          )}
        </Panel>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginTop: space.sm },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.secondary, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
});
