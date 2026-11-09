/**
 * Design tokens for the "Linen & Sky" brand direction (chosen 2026-11-05).
 *
 * Warm off-white ground, gentle brown as the primary action color, pale blue
 * as the soft accent, deep green for the Verified label. Lora for headings,
 * Figtree for everything else. Keep every color and font here so a rebrand
 * is a one-file change.
 */
export const colors = {
  background: '#F8F5EF', // linen
  surface: '#FFFFFF',
  surfaceSoft: '#EEF3F6', // pale sky tint for info panels
  text: '#2E2A26', // warm near-black
  textMuted: '#4F4A44',
  textSubtle: '#6E6760',
  primary: '#8C6E57', // gentle brown (buttons, links)
  primaryText: '#FFFFFF',
  secondary: '#3F5F73', // slate blue (secondary buttons)
  secondaryBorder: '#CFDDE6',
  accent: '#A9C4D4', // pale sky (decorative numbers, icon dots)
  verified: '#3C7A5A', // deep green, Verified badge
  border: '#E8E1D6',
  danger: '#B4443A',
} as const;

export const fonts = {
  heading: 'Lora_600SemiBold',
  headingItalic: 'Lora_500Medium_Italic',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodyBold: 'Figtree_700Bold',
} as const;

export const radius = { sm: 8, md: 10, lg: 18, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
