/**
 * One member's page. The database says whether the viewer gets the limited
 * preview or the full profile; this screen shows the right one and explains
 * what unlocks more.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChoiceField, FormMessage, TextField } from '@/components/form';
import { ProfileCard } from '@/components/ProfileCard';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { browseProfiles, compensationLine, listSavedIds, loadFullProfile, myAccessTo, prettyAnswers, saveProfile, unsaveProfile, type Access, type PreviewRow } from '@/lib/browse';
import { blockMember, canMessage, CAN_MESSAGE_TEXT, clearDraft, haveBlocked, loadDraft, saveDraft, sendMessage, unblockMember, type CanMessage } from '@/lib/messages';
import { reportMember, REPORT_OPTIONS, type ReportReason } from '@/lib/report';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Member profile');
}

export default function ProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile: me, loading } = useSession();
  const [access, setAccess] = useState<Access | null>(null);
  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [full, setFull] = useState<Awaited<ReturnType<typeof loadFullProfile>>>(null);
  const [saved, setSaved] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('scam_or_money');
  const [details, setDetails] = useState('');
  const [can, setCan] = useState<CanMessage | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (loading || !id) return;
    (async () => {
      const [rows, a] = await Promise.all([browseProfiles({ id }, 1), session ? myAccessTo(id) : Promise.resolve<Access>('preview')]);
      setPreview(rows[0] ?? null);
      setAccess(rows[0] ? a : 'none');
      if (rows[0] && a === 'full') setFull(await loadFullProfile(id));
      if (session) {
        setSaved((await listSavedIds(session.user.id)).includes(id));
        setBlocked(await haveBlocked(session.user.id, id));
      }
      setCan(session ? await canMessage(id) : 'sign_in');
      // A visitor who wrote a message before joining finds it waiting here.
      const kept = loadDraft(id);
      if (kept) { setDraft(kept); setComposing(true); }
    })();
  }, [id, loading, session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || access === null) return <Screen title="Loading…"><Text style={styles.note}>One moment.</Text></Screen>;
  if (!preview || access === 'none') {
    // Members only ever see the other side of the journey, so the most common
    // reason a signed-in member lands here is a profile of their own role
    // (for example an intended parent tapping another intended parent's card).
    const sameRoleNote =
      me?.role === 'intended_parent'
        ? 'Intended parents can only view surrogate profiles, so if this is another intended parent it will not open. '
        : me?.role === 'surrogate'
          ? 'Surrogates can only view intended-parent profiles, so if this is another surrogate it will not open. '
          : '';
    return (
      <Screen
        title="Profile not available"
        intro={`${sameRoleNote}Otherwise this profile is private, not finished yet, or no longer on the platform.`}
      >
        <Button label={me?.role === 'intended_parent' ? 'Browse surrogates' : me?.role === 'surrogate' ? 'Browse intended parents' : 'Browse profiles'} onPress={() => router.replace('/browse')} />
      </Screen>
    );
  }

  const isIpViewer = me?.role === 'intended_parent';
  const isMine = session?.user.id === id;

  // Blocking stops messages in both directions and is private to you.
  async function toggleBlock() {
    if (!session) return;
    if (blocked) {
      await unblockMember(session.user.id, id);
      setBlocked(false);
    } else {
      await blockMember(session.user.id, id);
      setBlocked(true);
      setComposing(false);
    }
    setCan(await canMessage(id));
  }

  // Private bookmark: keep browsing, come back later to message.
  async function toggleSave() {
    if (!session) return router.push('/join');
    if (saved) {
      await unsaveProfile(session.user.id, id);
      setSaved(false);
      return;
    }
    const err = await saveProfile(session.user.id, id);
    if (err) return setMsg({ kind: 'error', text: err });
    setSaved(true);
  }

  function startMessage() {
    if (!session) {
      saveDraft(id, draft);
      return router.push('/join');
    }
    setComposing(true);
  }

  async function sendFirst() {
    if (!draft.trim()) return;
    if (!session) { saveDraft(id, draft); return router.push('/join'); }
    setSending(true);
    const r = await sendMessage(id, draft.trim());
    setSending(false);
    if (r.error) return setMsg({ kind: 'error', text: r.error });
    clearDraft(id);
    if (r.status === 'locked') setMsg({ kind: 'info', text: `Delivered. ${preview!.display_name} will see your message once they have an active membership.` });
    router.push(`/messages/${r.conversationId}`);
  }

  async function sendReport() {
    if (!session) return router.push('/log-in');
    const err = await reportMember(session.user.id, id, reason, details);
    setReporting(false);
    setMsg(err ? { kind: 'error', text: err } : { kind: 'info', text: 'Thank you. Our safety team will review this report.' });
  }

  return (
    <Screen width={880} title={`${preview.display_name} · ${preview.state}`} intro={preview.is_verified ? 'Identity verified' : 'Identity not verified'}>
      {msg ? <FormMessage kind={msg.kind} text={msg.text} /> : null}

      {access === 'preview' ? (
        <>
          <View style={styles.previewWrap}>
            <ProfileCard name={preview.display_name} state={preview.state} role={preview.role} verified={preview.is_verified} headline={preview.headline_tags.join(' · ') || 'Profile complete'} photoUrl={preview.photo_url} photoUrls={preview.photo_urls} />
          </View>
          <View style={styles.wall}>
            <Text style={styles.wallTitle}>{session ? 'This is a limited preview' : 'Join to see more'}</Text>
            <Text style={styles.wallText}>
              {!session
                ? 'Members see more than previews. Surrogates join free and read full intended-parent profiles right away.'
                : isIpViewer
                  ? 'A membership unlocks full surrogate profiles, photos and messaging.'
                  : 'Full profiles are shown once your account is active.'}
            </Text>
            {!session ? <Button label="Join free" onPress={() => router.push('/join')} /> : null}
            {session && isIpViewer ? <Button label="See membership options" onPress={() => router.push('/membership')} /> : null}
          </View>
        </>
      ) : full ? (
        <>
          <View style={styles.photos}>
            {full.photoUrls.map((u, i) => (
              <Image key={i} source={{ uri: u }} style={styles.photo} accessibilityLabel={`Photo ${i + 1} of ${preview.display_name}`} />
            ))}
          </View>
          <View style={styles.tags}>
            {preview.headline_tags.map((t) => (
              <Text key={t} style={styles.tag}>{t}</Text>
            ))}
          </View>
          <Text style={styles.bio}>{full.profile.bio}</Text>
          {full.parents.length > 0 ? (
            <Section title="The family">
              {full.parents.map((p: any) => (
                <Row key={p.position} label={`Parent ${p.position}`} value={`${p.first_name ?? ''}${p.age ? `, ${p.age}` : ''}`} />
              ))}
            </Section>
          ) : null}
          <Section title="About the journey">
            {full.surrogate && compensationLine(full.surrogate) ? <Row label="Compensation" value={compensationLine(full.surrogate)!} /> : null}
            {prettyAnswers((full.surrogate ?? full.ip) as Record<string, unknown> | null, ['compensation_min_usd', 'compensation_max_usd', 'compensation_open', 'clinic_name']).map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </Section>
          <Text style={styles.note}>Health details are never part of a profile. Members discuss those directly, and clinics make all medical determinations.</Text>
        </>
      ) : (
        <Text style={styles.note}>Loading full profile…</Text>
      )}

      {!isMine ? (
        <View style={styles.actions}>
          {can !== 'same_role' ? <Button label="Message" disabled={can !== null && can !== 'ok' && can !== 'sign_in'} onPress={startMessage} /> : null}
          <Button label={saved ? 'Saved ✓ (tap to remove)' : 'Save profile'} variant="secondary" onPress={toggleSave} />
          <Button label="Report" variant="secondary" size="sm" onPress={() => setReporting((v) => !v)} />
          {session ? <Button label={blocked ? 'Unblock' : 'Block'} variant="secondary" size="sm" onPress={toggleBlock} /> : null}
        </View>
      ) : null}
      {!isMine && can && can !== 'ok' && can !== 'same_role' ? <Text style={styles.note}>{CAN_MESSAGE_TEXT[can]}</Text> : null}
      {!isMine && composing && (can === 'ok' || can === 'sign_in') ? (
        <View style={styles.reportBox}>
          <TextField label={`Message to ${preview.display_name}`} value={draft} onChangeText={setDraft} multiline maxLength={4000} placeholder="Say hello: who you are, what drew you to this profile, and what you hope for. Leave out contact details for now." />
          <Text style={styles.note}>Never send money to anyone you meet here. Messages may be reviewed by our safety team to protect members.</Text>
          <View style={styles.actions}>
            <Button label={sending ? 'Sending…' : !session ? 'Join free to send' : 'Send'} onPress={sendFirst} disabled={sending || !draft.trim()} />
            <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
          </View>
        </View>
      ) : null}
      {!isMine ? <Text style={styles.note}>Saved profiles are private to you. Never send money to anyone you meet here.</Text> : null}

      {reporting ? (
        <View style={styles.reportBox}>
          <ChoiceField label="What's wrong?" options={REPORT_OPTIONS} value={reason} onChange={(v) => setReason(v as ReportReason)} />
          <TextField label="Details" value={details} onChangeText={setDetails} multiline placeholder="Anything that helps our safety team" />
          <View style={styles.actions}>
            <Button label="Send report" onPress={sendReport} />
            <Button label="Cancel" variant="secondary" onPress={() => setReporting(false)} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center' },
  wall: { backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm, alignItems: 'center' },
  wallTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  wallText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: 260, height: 320, borderRadius: radius.lg, backgroundColor: colors.surfaceSoft, flexGrow: 1, maxWidth: 420 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.secondary, backgroundColor: colors.surfaceSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  bio: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: space.xs },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', paddingVertical: 4 },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSubtle, minWidth: 220 },
  rowValue: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1, minWidth: 160 },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' },
  reportBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
});
