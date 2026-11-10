/**
 * Member home: profile status, quick links, sign out.
 * Browsing and messaging arrive in later phases.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { admin } from '@/lib/admin';
import { createShareLink, getShareLink, revokeShareLink } from '@/lib/browse';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import { formatDate, formatUsd, identityLine, myIdentityCheck, myMembership, startVerification, type IdentityCheck, type Membership } from '@/lib/membership';
import { dismissNotice, draftProfileIds, myNotices, unreadCount, type Notice } from '@/lib/messages';
import { colors, fonts, radius, space } from '@/lib/theme';
import { privateMeta } from '@/lib/seo';

export function generateMetadata() {
  return privateMeta('Home');
}

export default function Home() {
  const { profile, signOut } = useSession();
  // Only people on the admin list see the Admin button.
  const [isAdminCandidate, setIsAdminCandidate] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [idCheck, setIdCheck] = useState<IdentityCheck | null>(null);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const drafts = draftProfileIds();
  useEffect(() => {
    admin.amICandidate().then((r) => setIsAdminCandidate(Boolean(r.data)));
    unreadCount().then(setUnread);
    myNotices().then(setNotices);
    if (profile) getShareLink(profile.id).then(setShareToken);
    myMembership().then(setMembership);
    myIdentityCheck().then(setIdCheck);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!profile) return null;
  const isSurrogate = profile.role === 'surrogate';
  const name = profile.display_name || (isSurrogate ? 'there' : 'intended parents');

  return (
    <Screen title={`Welcome, ${name}`} intro={isSurrogate ? 'Thank you for being here. Your profile is free, always.' : 'Your account is ready. Browse surrogate previews and save the ones you like.'}>
      {notices.map((n) => (
        <View key={n.id} style={[styles.card, styles.noticeCard]}>
          <Text style={styles.cardTitle}>A note from our safety team</Text>
          <Text style={styles.status}>{n.body}</Text>
          <Button label="Got it" variant="secondary" size="sm" onPress={() => { dismissNotice(n.id); setNotices((l) => l.filter((x) => x.id !== n.id)); }} />
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Messages</Text>
        <Text style={styles.status}>{unread > 0 ? `You have ${unread} unread message${unread === 1 ? '' : 's'}.` : 'No unread messages.'}</Text>
        <Button label={unread > 0 ? `Open messages (${unread})` : 'Open messages'} onPress={() => router.push('/messages')} />
        {drafts.length > 0 && profile.is_complete ? (
          <>
            <Text style={styles.status}>You wrote a message before joining. It is saved and ready to send.</Text>
            <Button label="Finish sending it" variant="secondary" size="sm" onPress={() => router.push(`/profile/${drafts[0]}`)} />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your profile</Text>
        <Text style={styles.status}>
          {profile.is_complete ? 'Complete and visible to members' : 'Not finished yet: it stays hidden until every required question is answered and 3 photos are added.'}
        </Text>
        <Text style={styles.status}>{identityLine(profile.is_verified, idCheck)}</Text>
        {verifyMsg ? <FormMessage kind="error" text={verifyMsg} /> : null}
        {!profile.is_verified && idCheck?.status !== 'processing' ? (
          <Button label={verifying ? 'Opening secure verification…' : 'Verify my identity (free)'} variant="secondary" disabled={verifying} onPress={async () => { setVerifying(true); const r = await startVerification(); if (r.error) { setVerifyMsg(r.error); setVerifying(false); } }} />
        ) : null}
        {profile.is_complete && profile.approx_lat == null ? (
          <Text style={styles.status}>New: add your ZIP code (in “About you”) to appear on the map and sort by distance. Only your approximate area is shown.</Text>
        ) : null}
        <Button label={profile.is_complete ? 'Edit my profile' : 'Finish my profile'} onPress={() => router.push(profile.is_complete ? '/onboarding/review' : '/onboarding/0')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isSurrogate ? 'Intended parents' : 'Surrogates'}</Text>
        <Text style={styles.status}>
          {isSurrogate
            ? 'Read full intended-parent profiles any time. Complete your own profile to start conversations.'
            : membership?.active
              ? `Your membership is active until ${formatDate(membership.current_period_end)}. Browse full surrogate profiles and message anyone.`
              : `Browse limited previews for free. A membership (${membership ? formatUsd(membership.price_usd) : '$199'} for ${membership?.term_months ?? 3} months) unlocks full profiles and messaging.`}
        </Text>
        <View style={styles.row}>
          <Button label="Browse" onPress={() => router.push('/browse')} />
          <Button label="Saved profiles" variant="secondary" onPress={() => router.push('/saved')} />
          {!isSurrogate ? <Button label={membership?.active ? 'Membership' : 'Get a membership'} variant={membership?.active ? 'secondary' : 'primary'} onPress={() => router.push('/membership')} /> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Share your profile</Text>
        <Text style={styles.status}>
          {profile.is_verified && profile.is_complete
            ? 'Create a private link to show your profile to someone off the platform, like your attorney or family. You can turn it off any time.'
            : 'Share links unlock once your profile is complete and verified.'}
        </Text>
        {shareMsg ? <FormMessage kind="info" text={shareMsg} /> : null}
        {shareToken ? (
          <>
            <Text selectable style={styles.link}>{`${SITE.url}/s/${shareToken}`}</Text>
            <Button label="Turn off this link" variant="secondary" size="sm" onPress={async () => { await revokeShareLink(profile.id); setShareToken(null); setShareMsg('Link turned off. Anyone who had it now sees nothing.'); }} />
          </>
        ) : (
          <Button
            label="Create share link"
            variant="secondary"
            size="sm"
            disabled={!(profile.is_verified && profile.is_complete)}
            onPress={async () => {
              const r = await createShareLink();
              if (r.error) return setShareMsg(r.error);
              setShareToken(r.token ?? null);
              setShareMsg('');
            }}
          />
        )}
      </View>

      {isAdminCandidate ? <Button label="Admin dashboard" variant="secondary" onPress={() => router.push('/admin')} /> : null}
      <Button label="Sign out" variant="secondary" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeCard: { borderColor: colors.danger },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  status: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.secondary },
});
