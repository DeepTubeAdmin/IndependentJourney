/** The browser's own <select>, styled to match the text inputs. */
import type { NativeSelectProps } from '@/components/NativeSelect';
import { colors } from '@/lib/theme';

export function NativeSelect({ options, value, onChange, placeholder, accessibilityLabel, width }: NativeSelectProps) {
  return (
    <select
      aria-label={accessibilityLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: 'Figtree_400Regular, Figtree, sans-serif',
        fontSize: 16,
        color: value ? colors.text : colors.textSubtle,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: '12px 36px 12px 12px',
        minWidth: width ?? 120,
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' stroke='%238C6E57' stroke-width='2' fill='none'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
