/** Safety flags (automatic and admin-added). */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AdminShell } from '@/components/admin/AdminShell';
import { Pill, Table } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { Checkbox, FormMessage } from '@/components/form';
import { admin, FLAG_KINDS, useAdminData, type Flag } from '@/lib/admin';
import { colors, fonts } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Admin flags');
}

export default function Flags() {
  const [openOnly, setOpenOnly] = useState(true);
  const { data, loading, reload } = useAdminData(() => admin.listFlags(openOnly), [openOnly]);
  const [msg, setMsg] = useState('');

  return (
    <AdminShell title="Flags" intro="Automatic flags come from bio text that looks like an agency pitch or contains contact details. Nothing is hidden automatically; you decide.">
      <Checkbox label="Show open flags only" checked={openOnly} onChange={setOpenOnly} />
      {msg ? <FormMessage kind="info" text={msg} /> : null}
      {loading ? <Text style={styles.note}>Loading…</Text> : null}
      <Table<Flag>
        rows={data ?? []}
        keyOf={(f) => String(f.id)}
        cols={[
          { key: 'kind', label: 'Flag', flex: 1.5, render: (f) => <Pill text={FLAG_KINDS[f.kind] ?? f.kind} tone={f.cleared_at ? 'neutral' : 'warn'} /> },
          { key: 'member', label: 'Member', flex: 1.5, render: (f) => `${f.profile?.display_name || '(no name)'} · ${f.profile?.role === 'surrogate' ? 'surrogate' : 'IP'}` },
          { key: 'note', label: 'Note', flex: 2, render: (f) => f.note || '—' },
          { key: 'src', label: 'Source', render: (f) => (f.created_by ? 'Admin' : 'Automatic') },
          { key: 'when', label: 'When', render: (f) => new Date(f.created_at).toLocaleDateString() },
          {
            key: 'act',
            label: '',
            flex: 1.5,
            render: (f) => (
              <>
                <Button label="Open member" variant="secondary" size="sm" onPress={() => router.push(`/admin/member/${f.profile_id}`)} />
                {!f.cleared_at ? (
                  <Button
                    label="Clear"
                    variant="secondary"
                    size="sm"
                    onPress={async () => {
                      const { error } = await admin.clearFlag(f.id, 'Cleared from flags list');
                      setMsg(error ?? `Flag #${f.id} cleared.`);
                      reload();
                    }}
                  />
                ) : null}
              </>
            ),
          },
        ]}
        empty={loading ? '' : 'No flags.'}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({ note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle } });
