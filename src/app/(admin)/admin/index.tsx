/** Admin overview: the numbers that matter today. */
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell, Panel } from '@/components/admin/AdminShell';
import { FormMessage } from '@/components/form';
import { admin, useAdminData } from '@/lib/admin';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function AdminHome() {
  const { data, error } = useAdminData(() => admin.overview());
  const { data: mail } = useAdminData(() => admin.emailStats());
  const n = (k: string) => (data ? String(data[k] ?? 0) : '…');
  return (
    <AdminShell title="Overview" intro="A quick picture of the community and what needs attention.">
      {error ? <FormMessage kind="error" text={error} /> : null}
      <View style={styles.grid}>
        <Stat label="Members" value={n('members_total')} />
        <Stat label="Surrogates" value={n('surrogates')} />
        <Stat label="Intended parents" value={n('intended_parents')} />
        <Stat label="Complete profiles" value={n('complete')} />
        <Stat label="Verified" value={n('verified')} />
        <Stat label="New this week" value={n('new_this_week')} />
        <Stat label="Open reports" value={n('open_reports')} href="/admin/reports" warn={Number(data?.open_reports) > 0} />
        <Stat label="Open flags" value={n('open_flags')} href="/admin/flags" warn={Number(data?.open_flags) > 0} />
        <Stat label="Messages this week" value={n('messages_this_week')} href="/admin/messages" />
        <Stat label="Flagged messages (30 days)" value={n('flagged_messages_open')} href="/admin/messages?flagged=1" warn={Number(data?.flagged_messages_open) > 0} />
        <Stat label="Active memberships" value={n('active_memberships')} />
        <Stat label="Revenue this month" value={data ? `$${(Number(data.revenue_this_month_cents ?? 0) / 100).toLocaleString('en-US')}` : '…'} />
      </View>
      <Panel title="Payments and ID checks">
        <Text style={styles.note}>Memberships are paid through Stripe and ID checks run through Stripe Identity. Refunds and card details live in your Stripe dashboard; a refund there ends the membership here automatically. Each member page shows their payments and ID-check history.</Text>
      </Panel>
      <Panel title="Email delivery">
        <Text style={styles.note}>
          {mail
            ? `Queued: ${mail.queued ?? 0} · Sent in the last 24 hours: ${mail.sent_24h ?? 0} · Failed: ${mail.failed ?? 0}` +
              (mail.last_sent_at ? ` · Last sent ${new Date(mail.last_sent_at).toLocaleString('en-US')}` : ' · Nothing sent yet')
            : 'Loading…'}
        </Text>
        {mail && Number(mail.queued) > 20 && !mail.last_sent_at ? <Text style={styles.warnText}>Emails are piling up and none have gone out. Check that the send-emails schedule and Resend secrets are set up (docs/RESEND_SETUP.md).</Text> : null}
        {Array.isArray(mail?.recent_failures) && mail.recent_failures.length > 0
          ? mail.recent_failures.map((f: any) => <Text key={f.id} style={styles.warnText}>{`#${f.id} ${f.template}: ${f.error ?? 'unknown error'}`}</Text>)
          : null}
      </Panel>
    </AdminShell>
  );
}

function Stat({ label, value, href, warn }: { label: string; value: string; href?: string; warn?: boolean }) {
  const body = (
    <View style={[styles.stat, warn && styles.statWarn]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  return href ? <Link href={href as never}>{body}</Link> : body;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { minWidth: 150, flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md },
  statWarn: { borderColor: '#E6B980', backgroundColor: '#FFF8EE' },
  statValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSubtle },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  warnText: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, lineHeight: 19 },
});
