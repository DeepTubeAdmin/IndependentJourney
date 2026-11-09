/**
 * App settings: membership price and term, conversation limits, allowed
 * states. These live in the database so they can change without a release.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell, Panel } from '@/components/admin/AdminShell';
import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { admin, useAdminData } from '@/lib/admin';
import { colors, fonts, space } from '@/lib/theme';

export default function Settings() {
  const { data, reload } = useAdminData(() => admin.listSettings());
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.map((s) => [s.key, JSON.stringify(s.value)])));
  }, [data]);

  async function save(key: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values[key]);
    } catch {
      return setMsg({ kind: 'error', text: `"${values[key]}" is not valid. Numbers are plain (199), lists look like ["TX","CA"].` });
    }
    const { error } = await admin.setSetting(key, parsed);
    setMsg(error ? { kind: 'error', text: error } : { kind: 'info', text: `${key} saved and logged.` });
    reload();
  }

  return (
    <AdminShell title="Settings" intro="Changes apply immediately to the website and apps. Each change is written to the audit log.">
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}
      {(data ?? []).map((s) => (
        <Panel key={s.key} title={s.key}>
          <Text style={styles.desc}>{s.description}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Value" value={values[s.key] ?? ''} onChangeText={(v) => setValues((o) => ({ ...o, [s.key]: v }))} />
            </View>
            <Button label="Save" size="sm" onPress={() => save(s.key)} />
          </View>
        </Panel>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
});
