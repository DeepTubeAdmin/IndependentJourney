import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '@/lib/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.page}>
        <Text style={styles.title}>We couldn't find that page.</Text>
        <Link href="/" style={styles.link}>
          Go to the homepage
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
});
