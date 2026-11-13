/**
 * Resources article: the first conversation between a surrogate and
 * intended parents. The text lives in src/content/firstConversation.ts so it
 * can be edited without touching layout. Public page (listed in the sitemap).
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Disclaimer } from '@/components/Disclaimer';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import {
  FIRST_CONVERSATION,
  FIRST_CONVERSATION_INTRO,
  FIRST_CONVERSATION_TITLE,
  type ArticleBlock,
} from '@/content/firstConversation';
import { pageMeta } from '@/lib/seo';
import { colors, fonts, radius, space } from '@/lib/theme';

export function generateMetadata() {
  return pageMeta({
    title: FIRST_CONVERSATION_TITLE,
    description:
      'A thorough question list for the first call between a surrogate and intended parents: termination, embryo transfer, daily life, communication, money, insurance, delivery, legal basics and red flags.',
    path: '/resources/first-conversation',
  });
}

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
  }
}

export default function FirstConversation() {
  return (
    <Screen width={760} title={FIRST_CONVERSATION_TITLE} intro={FIRST_CONVERSATION_INTRO}>
      <FormMessage kind="info" text="This article is general information, not legal, medical or financial advice. Please consult your own attorney and clinic." />
      <View style={styles.article}>
        {FIRST_CONVERSATION.map((b, i) => (
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
});
