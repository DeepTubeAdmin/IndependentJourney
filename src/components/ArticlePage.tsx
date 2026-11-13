/**
 * Shared layout for long-form Resources articles. The article text is a list
 * of simple blocks (see src/content/firstConversation.ts), so writers edit
 * content files and never this file.
 */
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Disclaimer } from '@/components/Disclaimer';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import type { ArticleBlock } from '@/content/firstConversation';
import { colors, fonts, radius, space } from '@/lib/theme';

/** Renders one block of the article. */
function Block({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'h2':
      return (
        <Text style={styles.h2} accessibilityRole="header" aria-level={2}>
          {block.text}
        </Text>
      );
    case 'h3':
      return (
        <Text style={styles.h3} accessibilityRole="header" aria-level={3}>
          {block.text}
        </Text>
      );
    case 'p':
      return <Text style={styles.p}>{block.text}</Text>;
    case 'note':
      return (
        <View style={styles.note}>
          <Text style={styles.noteText}>{block.text}</Text>
        </View>
      );
    case 'bullets':
      return (
        <View style={styles.list}>
          {block.items.map((t) => (
            <View key={t} style={styles.row}>
              <Text style={styles.marker}>•</Text>
              <Text style={styles.item}>{t}</Text>
            </View>
          ))}
        </View>
      );
    case 'numbered':
      return (
        <View style={styles.list}>
          {block.items.map((t, i) => (
            <View key={t} style={styles.row}>
              <Text style={styles.marker}>{i + 1}.</Text>
              <Text style={styles.item}>{t}</Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      // Scrolls sideways on narrow phones rather than squeezing the columns.
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              {block.header.map((h) => (
                <Text key={h} style={[styles.td, styles.th]}>{h}</Text>
              ))}
            </View>
            {block.rows.map((r) => (
              <View key={r[0]} style={styles.tr}>
                {r.map((c, i) => (
                  <Text key={i} style={styles.td}>{c}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
  }
}

type Props = { title: string; intro: string; blocks: ArticleBlock[] };

export function ArticlePage({ title, intro, blocks }: Props) {
  return (
    <Screen width={760} title={title} intro={intro}>
      <FormMessage kind="info" text="This article is general information, not legal, medical or financial advice. Please consult your own attorney and clinic." />
      <View style={styles.article}>
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </View>
      <Button label="Back to resources" variant="secondary" onPress={() => router.push('/resources')} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  article: { gap: space.sm },
  h2: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30, color: colors.text, marginTop: space.lg, marginBottom: 2 },
  h3: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, color: colors.text, marginTop: space.sm },
  p: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.text },
  list: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  marker: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.textMuted, minWidth: 18 },
  item: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.text },
  note: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, marginTop: space.md },
  noteText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted, fontStyle: 'italic' },
  tableScroll: { marginTop: space.sm },
  table: { minWidth: 560, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  trHead: { borderTopWidth: 0, backgroundColor: colors.surfaceSoft },
  td: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text, paddingVertical: 8, paddingHorizontal: 10 },
  th: { fontFamily: fonts.bodyBold, color: colors.textMuted },
});
