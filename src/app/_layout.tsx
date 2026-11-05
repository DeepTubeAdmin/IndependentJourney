/**
 * Root layout: loads fonts and sets up navigation for every screen.
 */
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Lora_500Medium_Italic } from '@expo-google-fonts/lora/500Medium_Italic';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/lib/theme';

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
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
