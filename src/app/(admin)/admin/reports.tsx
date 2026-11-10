/** Reports filed by members, newest first. Resolve or dismiss with a note. */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell, Panel } from '@/components/admin/AdminShell';
import { Pill } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { Checkbox, FormMessage, TextField } from '@/components/form';
import { admin, REPORT_REASONS, useAdminData, type Report } from '@/lib/admin';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin reports');
}

export default function Reports() {
  const [openOnly, setOpenOnly] = useState(true);
  const { data, loading, reload } = useAdminData(() => admin.listReports(openOnly), [openOnly]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');

  async function resolve(r: Report, status: Report['status']) {
    const { error } = await admin.resolveReport(r.id, status, notes[r.id] ?? '');
    setMsg(error ?? `Report #${r.id} marked ${status}.`);
    reload();
  }

  return (
    <AdminShell title="Reports" intro="What members have reported. Open the member to take action, then resolve or dismiss the report here.">
      <Checkbox label="Show open reports only" checked={openOnly} onChange={setOpenOnly} />
      {msg ? <FormMessage kind="info" text={msg} /> : null}
      {loading ? <Text style={styles.note}>Loading…</Text> : null}
      {(data ?? []).length === 0 && !loading ? <Text style={styles.note}>No reports.</Text> : null}
      {(data ?? []).map((r) => (
        <Panel key={r.id} title={`#${r.id} · ${REPORT_REASONS[r.reason] ?? r.reason}`}>
          <View style={styles.row}>
            <Pill text={r.status} tone={r.status === 'open' ? 'warn' : r.status === 'reviewing' ? 'neutral' : 'good'} />
            <Text style={styles.meta}>{new Date(r.created_at).toLocaleString()}</Text>
          </View>
          <Text style={styles.body}>{r.details || '(no details given)'}</Text>
          <Text style={styles.meta}>
            Reported member: {r.reported?.display_name || '(no name)'} ({r.reported?.role === 'surrogate' ? 'surrogate' : 'intended parent'})
          </Text>
          <Button label="Open reported member" variant="secondary" size="sm" onPress={() => router.push(`/admin/member/${r.reported_id}`)} />
          {r.status === 'open' || r.status === 'reviewing' ? (
            <>
              <TextField label="Resolution note" value={notes[r.id] ?? ''} onChangeText={(v) => setNotes((n) => ({ ...n, [r.id]: v }))} placeholder="What you found and did" />
              <View style={styles.row}>
                {r.status === 'open' ? <Button label="Mark reviewing" variant="secondary" size="sm" onPress={() => resolve(r, 'reviewing')} /> : null}
                <Button label="Resolve" size="sm" onPress={() => resolve(r, 'resolved')} />
                <Button label="Dismiss" variant="secondary" size="sm" onPress={() => resolve(r, 'dismissed')} />
              </View>
            </>
          ) : (
            <Text style={styles.meta}>Note: {r.resolution_note || '—'}</Text>
          )}
        </Panel>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
});
