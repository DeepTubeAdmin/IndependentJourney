/** Admin security: two-factor status and re-enrolment. */
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AdminShell, Panel } from '@/components/admin/AdminShell';
import { TwoFactorGate } from '@/components/admin/TwoFactorGate';
import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { mfa, useAdminData } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Security() {
  const { data, reload } = useAdminData(() => mfa.status());
  const [reset, setReset] = useState(false);
  const [msg, setMsg] = useState('');

  if (reset) return <TwoFactorGate onDone={() => { setReset(false); reload(); }} />;

  return (
    <AdminShell title="Security" intro="Admin pages require a code from your authenticator app every time you sign in.">
      {msg ? <FormMessage kind="info" text={msg} /> : null}
      <Panel title="Two-factor authentication">
        <Text style={styles.text}>Status: {data?.enrolled ? 'Authenticator app enrolled' : 'Not set up'} · This session: {data?.aal === 'aal2' ? 'confirmed' : 'not confirmed'}</Text>
        <Text style={styles.text}>Lost your phone? Remove the current authenticator and set up a new one. You will be asked for a code from the new app right away.</Text>
        <Button
          label={data?.enrolled ? 'Replace authenticator app' : 'Set up authenticator app'}
          variant="secondary"
          onPress={async () => {
            if (data?.factorId && supabase) {
              const { error } = await supabase.auth.mfa.unenroll({ factorId: data.factorId });
              if (error) return setMsg(error.message);
            }
            setReset(true);
          }}
        />
      </Panel>
      <Panel title="Adding another admin">
        <Text style={styles.text}>Admins are added in the database, never in code. In Supabase, open SQL Editor and run:</Text>
        <Text selectable style={styles.code}>{`insert into public.admin_roles (user_id)\nselect id from auth.users where email = 'person@example.com';`}</Text>
        <Text style={styles.text}>They then sign in normally, open /admin, and set up their authenticator app.</Text>
      </Panel>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  code: { fontFamily: 'monospace', fontSize: 13, color: colors.text, backgroundColor: colors.surfaceSoft, padding: 12, borderRadius: 8 },
});
