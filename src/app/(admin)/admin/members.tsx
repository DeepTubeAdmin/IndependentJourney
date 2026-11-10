/** Member search and list. Tap a row to open the member. */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/AdminShell';
import { Pill, Table } from '@/components/admin/Table';
import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { admin, memberStatus, useAdminData, type MemberRow } from '@/lib/admin';
import { colors, fonts, space } from '@/lib/theme';

export default function Members() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading } = useAdminData(() => admin.searchMembers(query, 200), [query]);

  return (
    <AdminShell title="Members" intro="Every member, newest account first. Search by name, email, state code or member ID.">
      <View style={styles.search}>
        <View style={{ flex: 1 }}>
          <TextField label="Search" value={q} onChangeText={setQ} placeholder="e.g. Megan, TX, someone@example.com" onSubmitEditing={() => setQuery(q)} returnKeyType="search" />
        </View>
        <Button label="Search" onPress={() => setQuery(q)} />
      </View>
      {error ? <FormMessage kind="error" text={error} /> : null}
      {loading ? <Text style={styles.note}>Loading…</Text> : null}
      <Table<MemberRow>
        rows={data ?? []}
        keyOf={(m) => m.id}
        onPress={(m) => router.push(`/admin/member/${m.id}`)}
        cols={[
          { key: 'name', label: 'Name', flex: 2, render: (m) => `${m.display_name || '(no name yet)'}${m.last_initial ? ' ' + m.last_initial + '.' : ''}` },
          { key: 'role', label: 'Role', render: (m) => (m.role === 'surrogate' ? 'Surrogate' : 'Intended parent') },
          { key: 'email', label: 'Email', flex: 2, render: (m) => m.email },
          { key: 'state', label: 'State', flex: 0.5, render: (m) => m.state || '—' },
          { key: 'joined', label: 'Joined', render: (m) => new Date(m.created_at).toLocaleDateString() },
          { key: 'complete', label: 'Profile', render: (m) => <Pill text={m.is_complete ? 'Complete' : 'Incomplete'} tone={m.is_complete ? 'good' : 'neutral'} /> },
          { key: 'verified', label: 'Identity', render: (m) => <Pill text={m.is_verified ? 'Verified' : 'Not verified'} tone={m.is_verified ? 'good' : 'neutral'} /> },
          { key: 'status', label: 'Status', render: (m) => <Pill text={memberStatus(m)} tone={memberStatus(m) === 'Active' ? 'neutral' : 'bad'} /> },
          { key: 'attn', label: 'Attention', render: (m) => (Number(m.open_reports) + Number(m.open_flags) > 0 ? <Pill text={`${m.open_reports} rep · ${m.open_flags} flag`} tone="warn" /> : <Text style={styles.dash}>—</Text>) },
        ]}
        empty={loading ? '' : 'No members match.'}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
  dash: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
});
