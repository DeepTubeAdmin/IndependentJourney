/**
 * Root layout: loads fonts and sets up navigation for every screen.
 */
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Lora_500Medium_Italic } from '@expo-google-fonts/lora/500Medium_Italic';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BetaWelcome } from '@/components/BetaWelcome';
import { SessionProvider } from '@/lib/auth';
import { colors, fonts, space } from '@/lib/theme';

export default function RootLayout() {
  // Fonts load in the background; text uses system fonts until they arrive.
  useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_700Bold,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
  });

  return (
    // SessionProvider keeps track of who is signed in for every screen.
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      {/* One-time "we just launched" note for visitors (admin setting beta_banner_enabled). */}
      <BetaWelcome />
    </SessionProvider>
  );
}

/** Shown instead of a blank screen if a page throws. Expo Router picks this up by name. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error(error);
  return (
    <View style={eb.page}>
      <Text style={eb.title}>Something went wrong</Text>
      <Text style={eb.text}>Sorry about that. Nothing you did caused it. Try again, or go back to the homepage.</Text>
      <View style={eb.row}>
        <Pressable onPress={retry} accessibilityRole="button" style={eb.btn}><Text style={eb.btnText}>Try again</Text></Pressable>
        <Pressable onPress={() => { if (typeof window !== 'undefined') window.location.assign('/'); }} accessibilityRole="button" style={[eb.btn, eb.btnSecondary]}><Text style={[eb.btnText, { color: colors.primary }]}>Homepage</Text></Pressable>
      </View>
    </View>
  );
}

const eb = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm, backgroundColor: colors.background },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted, textAlign: 'center', maxWidth: 420 },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  btn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryText },
});
