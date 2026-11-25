/**
 * State page, e.g. /surrogacy/texas: "Find a Surrogate in Texas".
 *
 * Shows how many surrogates and intended parents in the state have a live
 * profile (two numbers from the database, read when the page opens) and the
 * state's surrogacy law in brief. The law text lives in
 * src/content/stateLaws.ts, where each point is tied to a published source.
 * One page is built per state at publish time (generateStaticParams).
 */
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ArticlePage } from '@/components/ArticlePage';
import { Button } from '@/components/Button';
import type { ArticleBlock } from '@/content/firstConversation';
import { RELATED } from '@/content/guides/shared';
import { SOURCE_AAAA, SOURCE_ASRM, SOURCE_S360, STATE_LAWS, STATE_LAWS_REVIEWED, STATUS_LABEL, type StateLaw, stateBySlug } from '@/content/stateLaws';
import { pageMeta } from '@/lib/seo';
import { type StateCounts, stateMemberCounts } from '@/lib/stateCounts';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateStaticParams() {
  return STATE_LAWS.map((s) => ({ state: s.slug }));
}

export function generateMetadata(_request: unknown, params: Record<string, string | string[]>) {
  const s = stateBySlug(String(params?.state ?? ''));
  if (!s) return pageMeta({ title: 'Surrogacy by State', description: 'Surrogacy law in brief for every state.', path: '/surrogacy' });
  return pageMeta({
    title: `Find a Surrogate in ${s.name}: Members and Surrogacy Law in Brief`,
    description: `Surrogates and intended parents in ${s.name} on Independent Journey, free to browse and message, plus ${s.name} surrogacy law in brief with sources. Not legal advice.`,
    path: `/surrogacy/${s.slug}`,
  });
}

const NOTICE =
  'This page is general information only and is not legal advice. Surrogacy law changes often and can differ by county and by judge. Do not rely on this summary: speak to a reproductive attorney licensed in this state before you match, sign anything or start medical treatment.';

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function lawBlocks(s: StateLaw): ArticleBlock[] {
  const asrmDate = s.asrmUpdated === 'Update pending' ? 'not updated since before 2024' : `updated ${s.asrmUpdated}`;
  const blocks: ArticleBlock[] = [
    { kind: 'h2', text: `Is surrogacy legal in ${s.name}?` },
    { kind: 'p', text: `In brief: ${STATUS_LABEL[s.status].charAt(0).toLowerCase()}${STATUS_LABEL[s.status].slice(1)}. That one-line label is our plain-language summary of the two published overviews below, and the details matter more than the label.` },
  ];
  if (s.note) blocks.push({ kind: 'note', text: s.note });
  blocks.push(
    { kind: 'h3', text: 'What Surrogacy360 reports (March 2026)' },
    { kind: 'bullets', items: s.s360 },
    { kind: 'h3', text: `What the ASRM legal group reports (${asrmDate})` },
    { kind: 'bullets', items: s.asrm },
    { kind: 'h2', text: `Which state’s law applies to my journey?` },
    { kind: 'p', text: `Usually the law of the state where the baby will be born, which is normally where the surrogate lives. If the surrogate lives in ${s.name}, ${s.name} law is likely to govern how the intended parents become the legal parents, wherever they live. Intended parents who live in ${s.name} and match with a surrogate elsewhere should also check how their home state recognises the parentage order.` },
    { kind: 'h2', text: `What should I do before matching in ${s.name}?` },
    {
      kind: 'numbered',
      items: [
        `Each side speaks to its own reproductive attorney licensed in ${s.name}. Ask whether a compensated agreement is enforceable, who can be an intended parent, and how and when parentage is established.`,
        'Ask the fertility clinic for its written criteria for a gestational carrier.',
        'Have the surrogate’s health insurance checked for surrogacy exclusions.',
        'Agree in writing, through the attorneys, before any medication or payment. Payments belong in escrow.',
      ],
    },
    { kind: 'h2', text: 'Related guides' },
    { kind: 'links', items: [RELATED.legal, RELATED.find, RELATED.become, RELATED.pay, { label: 'Surrogacy law in other states', path: '/surrogacy' }] },
    {
      kind: 'note',
      text: `Independent Journey is an introduction platform, not a law firm, and nothing on this page is legal advice. The points above report what two outside organisations have published; we have not independently verified them against ${s.name} statutes or court decisions, and they may be out of date or incomplete. Always confirm the current law with an attorney licensed in ${s.name}.`,
    },
    { kind: 'h2', text: 'Sources' },
    { kind: 'sources', items: [SOURCE_S360, SOURCE_ASRM, SOURCE_AAAA] },
  );
  return blocks;
}

export default function StatePage() {
  const { state } = useLocalSearchParams<{ state: string }>();
  const s = stateBySlug(String(state ?? ''));
  const [counts, setCounts] = useState<StateCounts | null>(null);

  useEffect(() => {
    if (!s) return;
    let live = true;
    stateMemberCounts(s.code).then((c) => {
      if (live) setCounts(c);
    });
    return () => {
      live = false;
    };
  }, [s]);

  if (!s) {
    return (
      <ArticlePage title="Surrogacy by State" intro="We could not find that state." blocks={[{ kind: 'links', items: [{ label: 'See all states', path: '/surrogacy' }] }]} />
    );
  }

  const total = counts ? counts.surrogates + counts.intended_parents : 0;
  return (
    <ArticlePage
      title={`Find a Surrogate in ${s.name}`}
      intro={`Surrogates and intended parents in ${s.name} on Independent Journey, and ${s.name} surrogacy law in brief.`}
      blocks={lawBlocks(s)}
      reviewed={STATE_LAWS_REVIEWED}
      notice={NOTICE}
      backLabel="All states"
      backPath="/surrogacy"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header" aria-level={2}>
          Members in {s.name} right now
        </Text>
        {counts && total > 0 ? (
          <Text style={styles.cardText}>
            {plural(counts.surrogates, 'surrogate', 'surrogates')} and {plural(counts.intended_parents, 'intended-parent profile', 'intended-parent profiles')} in {s.name} are live on Independent Journey today. Members in other states may also be open to matching across state lines.
          </Text>
        ) : counts ? (
          <Text style={styles.cardText}>
            No one in {s.name} has a live profile yet. Members in other states may be open to matching across state lines, and you can be the first here.
          </Text>
        ) : (
          <Text style={styles.cardText}>
            Browse surrogates and intended parents on Independent Journey.
          </Text>
        )}
        <Text style={styles.cardSmall}>Free to join, browse and message. No match fees. The Browse button opens the list filtered to {s.name}.</Text>
        <View style={styles.row}>
          <Button label="Browse profiles" onPress={() => router.push(`/browse?state=${s.code}`)} />
          <Button label="Join free" variant="secondary" onPress={() => router.push('/join')} />
        </View>
        <Link href="/how-it-works" style={styles.link}>How Independent Journey works</Link>
      </View>
    </ArticlePage>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  cardText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.text },
  cardSmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  link: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
});
