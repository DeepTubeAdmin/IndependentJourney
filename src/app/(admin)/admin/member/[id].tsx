/**
 * One member: everything on file, plus the admin actions
 * (verify, suspend, ban, flag). Every action asks for a short reason,
 * which goes into the audit log.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AdminShell, KV, Panel } from '@/components/admin/AdminShell';
import { Pill } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { ChoiceField, FormMessage, TextField } from '@/components/form';
import { admin, FLAG_KINDS, memberStatus, REPORT_REASONS, useAdminData } from '@/lib/admin';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin member');
}

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useAdminData(() => admin.memberDetail(id), [id]);
  const [reason, setReason] = useState('');
  const [flagKind, setFlagKind] = useState('fraud_suspected');
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const paths = (data?.photos ?? []).map((p: { storage_path: string }) => p.storage_path);
    admin.photoUrls(paths).then(setPhotos);
  }, [data]);

  if (error) return <AdminShell title="Member"><FormMessage kind="error" text={error} /></AdminShell>;
  if (!data) return <AdminShell title="Member"><Text style={styles.note}>Loading…</Text></AdminShell>;

  const p = data.profile;
  const priv = data.private ?? {};
  const isSurrogate = p.role === 'surrogate';

  async function act(label: string, fn: () => Promise<{ error: string | null }>) {
    if (!reason.trim()) return setMsg({ kind: 'error', text: 'Add a short reason first; it goes into the audit log.' });
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.error) return setMsg({ kind: 'error', text: r.error });
    setMsg({ kind: 'info', text: `${label} done and logged.` });
    setReason('');
    reload();
  }

  const status = memberStatus(p);

  return (
    <AdminShell title={`${p.display_name || '(no name yet)'}${p.last_initial ? ' ' + p.last_initial + '.' : ''}`} intro={`${isSurrogate ? 'Surrogate' : 'Intended parent'} · ${data.email} · joined ${new Date(p.created_at).toLocaleDateString()}`}>
      <View style={styles.pills}>
        <Pill text={p.is_complete ? 'Profile complete' : 'Profile incomplete'} tone={p.is_complete ? 'good' : 'neutral'} />
        <Pill text={p.is_verified ? 'Verified' : 'Not verified'} tone={p.is_verified ? 'good' : 'neutral'} />
        <Pill text={status} tone={status === 'Active' ? 'neutral' : 'bad'} />
        <Pill text={`Visibility: ${p.visibility === 'public_previews' ? 'public previews' : 'members only'}`} />
      </View>

      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}

      <Panel title="Actions">
        <TextField label="Reason (required, goes in the audit log)" value={reason} onChangeText={setReason} placeholder="e.g. ID checked by video call on Nov 12" />
        <View style={styles.actions}>
          {p.is_verified ? (
            <Button label="Remove Verified" variant="secondary" size="sm" disabled={busy} onPress={() => act('Unverify', () => admin.setVerified(p.id, false, reason))} />
          ) : (
            <Button label="Mark Verified" size="sm" disabled={busy} onPress={() => act('Verify', () => admin.setVerified(p.id, true, reason))} />
          )}
          {status.startsWith('Suspended') ? (
            <Button label="Lift suspension" variant="secondary" size="sm" disabled={busy} onPress={() => act('Unsuspend', () => admin.setStatus(p.id, 'unsuspend', reason))} />
          ) : (
            <>
              <Button label="Suspend 7 days" variant="secondary" size="sm" disabled={busy} onPress={() => act('Suspend', () => admin.setStatus(p.id, 'suspend', reason, new Date(Date.now() + 7 * 864e5)))} />
              <Button label="Suspend 30 days" variant="secondary" size="sm" disabled={busy} onPress={() => act('Suspend', () => admin.setStatus(p.id, 'suspend', reason, new Date(Date.now() + 30 * 864e5)))} />
            </>
          )}
          {p.banned_at ? (
            <Button label="Lift ban" variant="secondary" size="sm" disabled={busy} onPress={() => act('Unban', () => admin.setStatus(p.id, 'unban', reason))} />
          ) : (
            <Button label="Ban" variant="secondary" size="sm" disabled={busy} onPress={() => act('Ban', () => admin.setStatus(p.id, 'ban', reason))} />
          )}
        </View>
        {!isSurrogate ? (
          <Panel title="Membership and payments">
            {data.membership ? (
              <>
                <KV k="Status" v={`${data.membership.status}${data.membership.current_period_end ? ' · until ' + new Date(data.membership.current_period_end).toLocaleDateString() : ''}`} />
                <KV k="Source" v={data.membership.source === 'stripe' ? 'Paid through Stripe' : data.membership.source === 'manual' ? 'Granted by an admin' : String(data.membership.source)} />
                {data.membership.stripe_customer_id ? <KV k="Stripe customer" v={data.membership.stripe_customer_id} /> : null}
              </>
            ) : <Text style={styles.note}>No membership yet.</Text>}
            {(data.payments ?? []).filter((e: any) => e.type === 'checkout.session.completed').map((e: any) => (
              <KV key={e.id} k={new Date(e.created_at).toLocaleDateString()} v={`Paid $${((e.amount_cents ?? 0) / 100).toLocaleString('en-US')} · ${e.id}`} />
            ))}
          </Panel>
        ) : null}
        {(data.identity_checks ?? []).length > 0 ? (
          <Panel title="ID checks (Stripe Identity)">
            {(data.identity_checks ?? []).map((c: any) => (
              <KV key={c.id} k={new Date(c.created_at).toLocaleDateString()} v={`${c.status}${c.last_error ? ' · ' + c.last_error : ''}`} />
            ))}
          </Panel>
        ) : null}
        {!isSurrogate ? (
          <View style={styles.actions}>
            <Button label="Grant 3-month membership" variant="secondary" size="sm" disabled={busy} onPress={() => act('Grant membership', () => admin.grantMembership(p.id, 3, reason))} />
            <Button label="End membership" variant="secondary" size="sm" disabled={busy} onPress={() => act('End membership', () => admin.endMembership(p.id, reason))} />
          </View>
        ) : null}
        <View style={styles.flagRow}>
          <View style={{ flex: 1 }}>
            <ChoiceField label="Add a flag" options={Object.entries(FLAG_KINDS).map(([value, label]) => ({ value, label }))} value={flagKind} onChange={setFlagKind} />
          </View>
          <Button label="Add flag" variant="secondary" size="sm" disabled={busy} onPress={() => act('Flag', () => admin.addFlag(p.id, flagKind, reason))} />
        </View>
      </Panel>

      <Panel title="Flags and reports">
        {(data.flags ?? []).length === 0 && (data.reports_against ?? []).length === 0 ? <Text style={styles.note}>None.</Text> : null}
        {(data.flags ?? []).map((f: any) => (
          <View key={`f${f.id}`} style={styles.item}>
            <Pill text={FLAG_KINDS[f.kind] ?? f.kind} tone={f.cleared_at ? 'neutral' : 'warn'} />
            <Text style={styles.itemText}>{f.note || '(no note)'} · {f.created_by ? 'by admin' : 'automatic'} · {new Date(f.created_at).toLocaleString()}{f.cleared_at ? ' · cleared' : ''}</Text>
            {!f.cleared_at ? <Button label="Clear" size="sm" variant="secondary" disabled={busy} onPress={() => act('Clear flag', () => admin.clearFlag(f.id, reason))} /> : null}
          </View>
        ))}
        {(data.reports_against ?? []).map((r: any) => (
          <View key={`r${r.id}`} style={styles.item}>
            <Pill text={`Report: ${REPORT_REASONS[r.reason] ?? r.reason}`} tone={r.status === 'open' || r.status === 'reviewing' ? 'warn' : 'neutral'} />
            <Text style={styles.itemText}>{r.details || '(no details)'} · {r.status} · {new Date(r.created_at).toLocaleString()}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Photos">
        <View style={styles.photos}>
          {photos.length === 0 ? <Text style={styles.note}>No photos yet.</Text> : null}
          {photos.map((u, i) => (u ? <Image key={i} source={{ uri: u }} style={styles.photo} accessibilityLabel={`Photo ${i + 1}`} /> : null))}
        </View>
      </Panel>

      <Panel title="Profile">
        <KV k="Display name" v={p.display_name} />
        <KV k="State" v={p.state} />
        <KV k="Bio" v={p.bio} />
        <KV k="Headline tags" v={(p.headline_tags ?? []).join(', ')} />
        <KV k="Featured opt-in" v={p.featured_opt_in ? 'Yes' : 'No'} />
      </Panel>

      <Panel title="Private details (never shown to members)">
        <KV k="Legal name" v={[priv.first_name, priv.last_name].filter(Boolean).join(' ')} />
        <KV k="Date of birth" v={priv.date_of_birth} />
        <KV k="City" v={priv.city} />
        <KV k="Phone" v={priv.phone} />
        <KV k="Attested individual" v={priv.attested_individual ? 'Yes' : 'No'} />
        <KV k="Attested age" v={priv.attested_age ? 'Yes' : 'No'} />
      </Panel>

      {isSurrogate ? (
        <>
          <Panel title="Journey answers">{Object.entries(data.surrogate ?? {}).filter(([k]) => k !== 'id').map(([k, v]) => <KV key={k} k={pretty(k)} v={k.endsWith('_usd') && v != null ? '$' + Number(v).toLocaleString('en-US') : fmt(v)} />)}</Panel>
          <Panel title="Health self-report (admin only)">{Object.entries(data.health ?? {}).filter(([k]) => k !== 'id').map(([k, v]) => <KV key={k} k={pretty(k)} v={fmt(v)} />)}</Panel>
        </>
      ) : (
        <>
          <Panel title="Parents">{(data.parents ?? []).map((pp: any) => <KV key={pp.position} k={`Parent ${pp.position}`} v={`${pp.first_name ?? ''}${pp.age ? `, ${pp.age}` : ''}`} />)}</Panel>
          <Panel title="Journey answers">{Object.entries(data.ip ?? {}).filter(([k]) => k !== 'id').map(([k, v]) => <KV key={k} k={pretty(k)} v={fmt(v)} />)}</Panel>
        </>
      )}

      <Panel title="Consents">
        {(data.consents ?? []).map((c: any) => <KV key={c.id} k={c.document} v={`version ${c.version} · ${new Date(c.agreed_at).toLocaleString()}`} />)}
      </Panel>

      <Panel title="Admin history for this member">
        {(data.audit ?? []).length === 0 ? <Text style={styles.note}>No admin actions yet.</Text> : null}
        {(data.audit ?? []).map((a: any) => <KV key={a.id} k={new Date(a.created_at).toLocaleString()} v={`${a.action} ${a.details?.reason ? '· ' + a.details.reason : ''}`} />)}
      </Panel>
    </AdminShell>
  );
}

function pretty(k: string) {
  return k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  flagRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, flexWrap: 'wrap' },
  item: { gap: space.xs, paddingVertical: space.xs, borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: 140, height: 170, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
});
