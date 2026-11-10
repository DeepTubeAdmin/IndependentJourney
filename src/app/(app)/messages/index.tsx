/** Inbox: one row per conversation. Locked rows explain what unlocks them. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { myConversations, NEVER_SEND_MONEY, timeAgo, type ConversationRow } from '@/lib/messages';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Messages');
}

export default function Inbox() {
  const { profile } = useSession();
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  useEffect(() => {
    myConversations().then(setRows);
  }, []);
  const isIp = profile?.role === 'intended_parent';
  const anyLocked = rows?.some((r) => r.locked);

  return (
    <Screen width={760} title="Messages" intro="Introductions happen here. Once you both feel comfortable, take the conversation wherever suits you.">
      <Text style={styles.banner}>{NEVER_SEND_MONEY}</Text>
      {isIp && anyLocked ? (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>You have messages waiting</Text>
          <Text style={styles.lockedText}>Surrogates have written to you. A membership lets you read and reply, and unlocks full surrogate profiles.</Text>
          <Button label="See membership options" size="sm" onPress={() => router.push('/membership')} />
        </View>
      ) : null}
      {rows === null ? <Text style={styles.note}>Loading…</Text> : null}
      {rows && rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.note}>No conversations yet. Browse profiles and send a message to someone whose journey fits yours.</Text>
          <Button label="Browse profiles" onPress={() => router.push('/browse')} />
        </View>
      ) : null}
      {(rows ?? []).map((r) => (
        <Pressable key={r.conversation_id} onPress={() => router.push(`/messages/${r.conversation_id}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
          <View style={styles.rowMain}>
            <Text style={styles.name}>
              {r.other_name} · {r.other_state} <Text style={r.other_verified ? styles.verified : styles.unverified}>{r.other_verified ? 'Verified' : 'Not verified'}</Text>
            </Text>
            <Text style={styles.preview} numberOfLines={1}>
              {r.locked ? `${r.unread > 0 ? `${r.unread} new message${r.unread === 1 ? '' : 's'}` : 'Messages'} · locked until you have a membership` : r.last_preview ?? ''}
            </Text>
          </View>
          <View style={styles.rowSide}>
            <Text style={styles.time}>{timeAgo(r.last_message_at)}</Text>
            {r.unread > 0 ? <Text style={styles.badge}>{r.unread}</Text> : null}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.secondary, backgroundColor: colors.surfaceSoft, borderRadius: radius.md, padding: space.sm },
  lockedBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: 4 },
  lockedTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  lockedText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  empty: { gap: space.sm, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md },
  pressed: { opacity: 0.85 },
  rowMain: { flex: 1, gap: 2 },
  rowSide: { alignItems: 'flex-end', gap: 4 },
  name: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  verified: { color: colors.verified, fontSize: 12 },
  unverified: { color: colors.textSubtle, fontSize: 12 },
  preview: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.textSubtle },
  badge: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primaryText, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.textSubtle },
});
