/**
 * The Independent Journey mark ("Offering": two cupped hands lifting a small
 * life), drawn as vector so it is crisp at any size on web and in the apps.
 * The master file is assets/logo/offering.svg; keep the two in step.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/lib/theme';

type Props = { size?: number; /** Colour of the hands; defaults to the brand brown. */ color?: string; accessibilityLabel?: string };

export function Logo({ size = 28, color = colors.primary, accessibilityLabel = 'Independent Journey' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Path d="M50 78 C30 78 18 62 22 46 C32 48 44 58 50 70 C56 58 68 48 78 46 C82 62 70 78 50 78 Z" fill={color} />
      <Circle cx={50} cy={40} r={9} fill={colors.accent} />
    </Svg>
  );
}
