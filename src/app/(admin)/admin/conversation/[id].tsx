/**
 * One conversation, for the safety team. Opening it is logged. Actions:
 * hide a message, warn either member, suspend or ban (each needs a reason).
 */
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell, Panel } from '@/components/admin/AdminShell';
import { Pill } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { admin, memberStatus, useAdminData } from '@/lib/admin';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin conversation');
}

export default function AdminConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useAdminData(() => admin.conversation(id), [id]);
  const [reason, setReason] = useState('');
  const [warning, setWarning] = useState('Please remember: asking for or sending money outside an attorney-managed escrow is not allowed here. Further messages like this will lead to suspension.');
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <AdminShell title="Conversation"><FormMessage kind="error" text={error} /></AdminShell>;
  if (!data) return <AdminShell title="Conversation"><Text style={styles.note}>Loading…</Text></AdminShell>;

  const s = data.surrogate;
  const ip = data.ip;
  const members = [s, ip];

  async function act(label: string, fn: () => Promise<{ error: string | null }>) {
    if (!reason.trim()) return setMsg({ kind: 'error', text: 'Add a short reason first; it goes into the audit log.' });
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.error) return setMsg({ kind: 'error', text: r.error });
    setMsg({ kind: 'info', text: `${label} done and logged.` });
    reload();
  }

  return (
    <AdminShell title={`${s.display_name} ↔ ${ip.display_name}`} intro="This access is recorded in the audit log.">
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}
      <Panel title="Members">
        {members.map((m: any) => (
          <View key={m.id} style={styles.memberRow}>
            <Link href={`/admin/member/${m.id}`} style={styles.link}>{m.display_name}</Link>
            <Pill text={m.is_verified ? 'Verified' : 'Not verified'} tone={m.is_verified ? 'good' : 'neutral'} />
            <Pill text={memberStatus(m)} tone={memberStatus(m) === 'Active' ? 'neutral' : 'bad'} />
          </View>
        ))}
      </Panel>

      <Panel title="Actions (reason required)">
        <TextField label="Reason for the audit log" value={reason} onChangeText={setReason} placeholder="e.g. report #12, asked for a wire transfer" />
        <TextField label="Warning text (shown on the member's home page)" value={warning} onChangeText={setWarning} multiline />
        {members.map((m: any) => (
          <View key={m.id} style={styles.actions}>
            <Text style={styles.actionsLabel}>{m.display_name}:</Text>
            <Button label="Warn" size="sm" variant="secondary" disabled={busy} onPress={() => act('Warn', () => admin.warnMember(m.id, warning, reason))} />
            <Button label="Suspend 7 days" size="sm" variant="secondary" disabled={busy} onPress={() => act('Suspend', () => admin.setStatus(m.id, 'suspend', reason, new Date(Date.now() + 7 * 864e5)))} />
            <Button label="Ban" size="sm" variant="secondary" disabled={busy} onPress={() => act('Ban', () => admin.setStatus(m.id, 'ban', reason))} />
          </View>
        ))}
      </Panel>

      <Panel title="Messages">
        {(data.messages ?? []).map((m: any) => {
          const fromSurrogate = m.sender_id === s.id;
          return (
            <View key={m.id} style={[styles.bubble, m.admin_hidden && styles.hiddenBubble]}>
              <Text style={styles.meta}>
                {fromSurrogate ? s.display_name : ip.display_name} · {new Date(m.created_at).toLocaleString()}{m.read_at ? ' · read' : ''}{m.admin_hidden ? ' · HIDDEN' : ''}
              </Text>
              <Text style={styles.body}>{m.body}</Text>
              <View style={styles.actions}>
                {(m.scam_flags ?? []).length ? <Pill text={m.scam_flags.join(', ')} tone="warn" /> : null}
                <Button label={m.admin_hidden ? 'Unhide' : 'Hide from recipient'} size="sm" variant="secondary" disabled={busy} onPress={() => act(m.admin_hidden ? 'Unhide' : 'Hide', () => admin.hideMessage(m.id, !m.admin_hidden, reason))} />
              </View>
            </View>
          );
        })}
      </Panel>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.secondary, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' },
  actionsLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, minWidth: 120 },
  bubble: { gap: 4, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  hiddenBubble: { opacity: 0.55 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSubtle },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text, backgroundColor: colors.surfaceSoft, borderRadius: radius.md, padding: space.sm },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
});
