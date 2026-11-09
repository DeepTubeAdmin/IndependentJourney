/**
 * One conversation. Polls for new messages every few seconds while open.
 * Shows the safety banner, an unverified-sender warning, and scam warnings
 * on flagged incoming messages. Block and report live here.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { Button } from '@/components/Button';
import { ChoiceField, FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import {
  blockMember, conversationMessages, haveBlocked, markRead, myConversations,
  NEVER_SEND_MONEY, SCAM_WARNING, sendMessage, unblockMember, UNVERIFIED_WARNING,
  type ConversationRow, type Message,
} from '@/lib/messages';
import { reportMember, REPORT_OPTIONS, type ReportReason } from '@/lib/report';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useSession();
  const [conv, setConv] = useState<ConversationRow | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('scam_or_money');
  const [details, setDetails] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  async function refresh() {
    if (!id) return;
    const rows = await myConversations();
    const c = rows.find((r) => r.conversation_id === id) ?? null;
    setConv(c);
    if (!c) return;
    if (!c.locked) {
      setMessages(await conversationMessages(id));
      await markRead(id);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conv || !session) return;
    haveBlocked(session.user.id, conv.other_id).then(setBlocked);
  }, [conv?.other_id, session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || !profile || conv === undefined) return <Screen title="Loading…"><Text style={styles.note}>One moment.</Text></Screen>;
  if (conv === null) {
    return (
      <Screen title="Conversation not found">
        <Button label="Back to messages" onPress={() => router.replace('/messages')} />
      </Screen>
    );
  }

  async function send() {
    if (!text.trim() || !conv) return;
    setBusy(true);
    setMsg(null);
    const r = await sendMessage(conv.other_id, text.trim());
    setBusy(false);
    if (r.error) return setMsg({ kind: 'error', text: r.error });
    setText('');
    if (r.status === 'locked') setMsg({ kind: 'info', text: `Delivered. ${conv.other_name} will see your message once they have an active membership.` });
    await refresh();
    scroller.current?.scrollToEnd({ animated: true });
  }

  async function toggleBlock() {
    if (!conv) return;
    if (blocked) await unblockMember(session!.user.id, conv.other_id);
    else await blockMember(session!.user.id, conv.other_id);
    setBlocked(!blocked);
    setMsg({ kind: 'info', text: blocked ? 'Unblocked.' : `${conv.other_name} is blocked. Neither of you can message the other.` });
  }

  async function sendReport() {
    if (!conv) return;
    const err = await reportMember(session!.user.id, conv.other_id, reason, `${details}\n\n[conversation ${conv.conversation_id}]`);
    setReporting(false);
    setMsg(err ? { kind: 'error', text: err } : { kind: 'info', text: 'Thank you. Our safety team will review this conversation.' });
  }

  return (
    <Screen width={760} title={`${conv.other_name} · ${conv.other_state}`} intro={`${conv.other_role === 'surrogate' ? 'Surrogate' : 'Intended parent'} · ${conv.other_verified ? 'Identity verified' : 'Identity not verified'}`}>
      <View style={styles.topRow}>
        <Button label="All messages" variant="secondary" size="sm" onPress={() => router.replace('/messages')} />
        <Button label="View profile" variant="secondary" size="sm" onPress={() => router.push(`/profile/${conv.other_id}`)} />
        <Button label={blocked ? 'Unblock' : 'Block'} variant="secondary" size="sm" onPress={toggleBlock} />
        <Button label="Report" variant="secondary" size="sm" onPress={() => setReporting((v) => !v)} />
      </View>
      <Text style={styles.banner}>{NEVER_SEND_MONEY} Messages may be reviewed by our safety team to protect members.</Text>
      {!conv.other_verified ? <FormMessage kind="info" text={UNVERIFIED_WARNING} /> : null}
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}

      {reporting ? (
        <View style={styles.box}>
          <ChoiceField label="What's wrong?" options={REPORT_OPTIONS} value={reason} onChange={(v) => setReason(v as ReportReason)} />
          <TextField label="Details" value={details} onChangeText={setDetails} multiline placeholder="Anything that helps our safety team" />
          <View style={styles.topRow}>
            <Button label="Send report" onPress={sendReport} />
            <Button label="Cancel" variant="secondary" onPress={() => setReporting(false)} />
          </View>
        </View>
      ) : null}

      {conv.locked ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>{conv.unread > 0 ? `${conv.other_name} has written to you` : 'Messages are locked'}</Text>
          <Text style={styles.boxText}>A membership lets you read and reply, and unlocks full surrogate profiles. Memberships open in a coming update. You can still view {conv.other_name}&apos;s limited preview.</Text>
        </View>
      ) : (
        <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={styles.threadInner} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
          {messages.map((m) => {
            const mine = m.sender_id === session.user.id;
            return (
              <View key={m.id} style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine && styles.mineText]}>{m.body}</Text>
                </View>
                <Text style={styles.stamp}>{new Date(m.created_at).toLocaleString()}{mine && m.read_at ? ' · Read' : ''}</Text>
                {!mine && m.scam_flags.length > 0 ? (
                  <Text style={styles.scam}>{m.scam_flags.map((f) => SCAM_WARNING[f]).filter(Boolean).join(' ')}</Text>
                ) : null}
              </View>
            );
          })}
          {messages.length === 0 ? <Text style={styles.note}>No messages yet.</Text> : null}
        </ScrollView>
      )}

      {!conv.locked && !blocked ? (
        <View style={styles.compose}>
          <TextField label="Your message" value={text} onChangeText={setText} multiline maxLength={4000} placeholder="Keep it kind, specific and free of contact details until you are ready." />
          <Button label={busy ? 'Sending…' : 'Send'} onPress={send} disabled={busy || !text.trim()} />
        </View>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  banner: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.secondary, backgroundColor: colors.surfaceSoft, borderRadius: radius.md, padding: space.sm },
  box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  boxTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  boxText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  thread: { maxHeight: 520, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  threadInner: { padding: space.md, gap: space.sm },
  bubbleWrap: { maxWidth: '85%', gap: 2 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.primary },
  theirs: { backgroundColor: colors.surfaceSoft },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  mineText: { color: colors.primaryText },
  stamp: { fontFamily: fonts.body, fontSize: 11, color: colors.textSubtle },
  scam: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger, maxWidth: 520 },
  compose: { gap: space.xs },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSubtle },
});
