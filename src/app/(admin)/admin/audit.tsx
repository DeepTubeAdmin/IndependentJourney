/** Every admin action, newest first. Read-only. */
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AdminShell } from '@/components/admin/AdminShell';
import { Table } from '@/components/admin/Table';
import { admin, useAdminData, type AuditRow } from '@/lib/admin';
import { colors, fonts } from '@/lib/theme';

export default function Audit() {
  const { data, loading } = useAdminData(() => admin.listAudit(300));
  return (
    <AdminShell title="Audit log" intro="A permanent record of every admin action. Rows cannot be edited or deleted.">
      {loading ? <Text style={styles.note}>Loading…</Text> : null}
      <Table<AuditRow>
        rows={data ?? []}
        keyOf={(a) => String(a.id)}
        onPress={(a) => (a.target_id ? router.push(`/admin/member/${a.target_id}`) : undefined)}
        cols={[
          { key: 'when', label: 'When', flex: 1.2, render: (a) => new Date(a.created_at).toLocaleString() },
          { key: 'action', label: 'Action', render: (a) => a.action },
          { key: 'target', label: 'Member', render: (a) => (a.target_id ? a.target_id.slice(0, 8) + '…' : '—') },
          { key: 'details', label: 'Details', flex: 3, render: (a) => summarize(a.details) },
          { key: 'admin', label: 'Admin', render: (a) => a.admin_id.slice(0, 8) + '…' },
        ]}
        empty={loading ? '' : 'No actions yet.'}
      />
    </AdminShell>
  );
}

function summarize(d: Record<string, unknown>): string {
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

const styles = StyleSheet.create({ note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle } });
