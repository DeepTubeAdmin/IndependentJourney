/**
 * One-time welcome note for new visitors while the site is in beta. Shown
 * once per browser (remembered locally), only to people who are not signed
 * in, and only while the admin setting beta_banner_enabled is true.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/lib/theme';

const SEEN_KEY = 'ij_beta_welcome_seen';

function alreadySeen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function remember() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* private browsing: it just shows again next time */
  }
}

export function BetaWelcome() {
  const { session, loading } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || session || alreadySeen() || !supabase) return;
    let cancelled = false;
    supabase.from('app_settings').select('value').eq('key', 'beta_banner_enabled').maybeSingle().then(({ data }) => {
      if (!cancelled && data && data.value === true) setOpen(true);
    });
    return () => { cancelled = true; };
  }, [loading, session]);

  function close(goJoin: boolean) {
    remember();
    setOpen(false);
    if (goJoin) router.push('/join');
  }

  if (!open) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => close(false)} accessibilityLabel="Close">
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.eyebrow}>Just launched · beta</Text>
          <Text style={styles.title}>You found us early</Text>
          <Text style={styles.body}>
            Independent Journey is brand new, and we are growing it one family at a time. While we are in beta, intended parents get a full membership free, and surrogates are always free.
          </Text>
          <Text style={styles.body}>
            Every profile created now makes it easier for the next surrogate or family to find their match. We would love for yours to be one of the first.
          </Text>
          <View style={styles.row}>
            <Button label="Create a free profile" onPress={() => close(true)} />
            <Button label="Just looking for now" variant="secondary" onPress={() => close(false)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43, 38, 34, 0.45)', alignItems: 'center', justifyContent: 'center', padding: space.md },
  card: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
});
