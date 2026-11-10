/**
 * Message review. Search by keyword, member or flagged status. Every search
 * and every conversation opened is written to the audit log by the database.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/AdminShell';
import { Pill, Table } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { Checkbox, FormMessage, TextField } from '@/components/form';
import { admin, useAdminData, type AdminMessageRow } from '@/lib/admin';
import { colors, fonts, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin messages');
}

export default function AdminMessages() {
  const params = useLocalSearchParams<{ flagged?: string; member?: string }>();
  const [q, setQ] = useState('');
  const [member, setMember] = useState(params.member ?? '');
  const [flagged, setFlagged] = useState(params.flagged === '1');
  const [applied, setApplied] = useState({ q: '', member: params.member ?? '', flagged: params.flagged === '1' });
  const { data, error } = useAdminData(() => admin.searchMessages(applied.q, applied.member.trim() || null, applied.flagged), [applied]);

  return (
    <AdminShell title="Message review" intro="For safety and fraud prevention only. Each search and each conversation you open is recorded in the audit log.">
      <View style={styles.filters}>
        <View style={{ flex: 2, minWidth: 220 }}>
          <TextField label="Keyword" value={q} onChangeText={setQ} placeholder="e.g. zelle, fee, whatsapp" />
        </View>
        <View style={{ flex: 2, minWidth: 220 }}>
          <TextField label="Member ID (from their member page)" value={member} onChangeText={setMember} placeholder="paste a member id" />
        </View>
        <Checkbox label="Flagged only" checked={flagged} onChange={setFlagged} />
        <Button label="Search" size="sm" onPress={() => setApplied({ q, member, flagged })} />
      </View>
      {error ? <FormMessage kind="error" text={error} /> : null}
      <Table<AdminMessageRow>
        cols={[
          { key: 'when', label: 'When', flex: 1.2, render: (r) => new Date(r.created_at).toLocaleString() },
          { key: 'from', label: 'From → To', flex: 1.5, render: (r) => `${r.sender_name} → ${r.recipient_name}` },
          { key: 'body', label: 'Message', flex: 3, render: (r) => <Text style={[styles.body, r.admin_hidden && styles.hidden]} numberOfLines={2}>{r.body}</Text> },
          { key: 'flags', label: 'Flags', flex: 1, render: (r) => (r.scam_flags.length ? <Pill text={r.scam_flags.join(', ')} tone="warn" /> : r.admin_hidden ? <Pill text="hidden" /> : '') },
        ]}
        rows={data ?? []}
        keyOf={(r) => String(r.id)}
        onPress={(r) => router.push(`/admin/conversation/${r.conversation_id}`)}
        empty={data ? 'No messages match.' : 'Loading…'}
      />
      <Text style={styles.note}>Tap a row to open the whole conversation, hide a message, or warn, suspend or ban a member.</Text>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'flex-end' },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  hidden: { color: colors.textSubtle, textDecorationLine: 'line-through' },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
});
