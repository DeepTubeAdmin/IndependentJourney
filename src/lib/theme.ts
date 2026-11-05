/**
 * Placeholder design tokens. These will be replaced once a brand direction is
 * chosen. Keep colors and sizes here so a rebrand is a one-file change.
 */
export const colors = {
  background: '#FBF7F2', // warm off-white
  surface: '#FFFFFF',
  text: '#2B2A33', // near-black, AAA contrast on background
  textMuted: '#5E5A66', // AA contrast on background
  primary: '#B5543C', // terracotta
  primaryText: '#FFFFFF',
  accent: '#3E6B5E', // sage green
  border: '#E8DFD4',
} as const;

export const fonts = {
  heading: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
