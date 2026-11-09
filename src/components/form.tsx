/**
 * Form building blocks shared by sign-up, login and onboarding.
 * Every control has a visible label and works with a keyboard and screen reader.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { Option } from '@/config/questionnaire';
import { colors, fonts, radius, space } from '@/lib/theme';

type LabelProps = { label: string; help?: string; required?: boolean; error?: string };

export function FieldWrap({ label, help, required, error, children }: LabelProps & { children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : <Text style={styles.optional}>  optional</Text>}
      </Text>
      {help ? <Text style={styles.help}>{help}</Text> : null}
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  help,
  required,
  error,
  multiline,
  ...input
}: LabelProps & TextInputProps) {
  return (
    <FieldWrap label={label} help={help} required={required} error={error}>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, multiline && styles.textarea, error && styles.inputError, input.style]}
      />
    </FieldWrap>
  );
}

/** Pick one option from a row of chips. */
export function ChoiceField({
  label,
  help,
  required,
  error,
  options,
  value,
  onChange,
}: LabelProps & { options: Option[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <FieldWrap label={label} help={help} required={required} error={error}>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldWrap>
  );
}

/** Pick any number of options. */
export function MultiChoiceField({
  label,
  help,
  required,
  error,
  options,
  value,
  onChange,
}: LabelProps & { options: Option[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <FieldWrap label={label} help={help} required={required} error={error}>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => toggle(o.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldWrap>
  );
}

export function YesNoField(props: LabelProps & { value: boolean | null; onChange: (v: boolean) => void }) {
  const { value, onChange, ...rest } = props;
  return (
    <ChoiceField
      {...rest}
      options={[
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ]}
      value={value === null ? null : String(value)}
      onChange={(v) => onChange(v === 'true')}
    />
  );
}

/** A searchable list for long option sets such as US states. */
export function SelectField({
  label,
  help,
  required,
  error,
  options,
  value,
  onChange,
}: LabelProps & { options: Option[]; value: string | null; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const matches = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  return (
    <FieldWrap label={label} help={help} required={required} error={error}>
      <TextInput
        accessibilityLabel={label}
        value={open ? query : (selected?.label ?? '')}
        placeholder="Start typing…"
        placeholderTextColor={colors.textSubtle}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChangeText={setQuery}
        style={[styles.input, error && styles.inputError]}
      />
      {open ? (
        <View style={styles.menu}>
          {matches.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              accessibilityRole="button"
              style={styles.menuItem}
            >
              <Text style={styles.menuText}>{o.label}</Text>
            </Pressable>
          ))}
          {matches.length === 0 ? <Text style={[styles.menuText, styles.menuItem]}>No matches</Text> : null}
        </View>
      ) : null}
    </FieldWrap>
  );
}

export function Checkbox({ label, checked, onChange, error }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <View style={styles.field}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={styles.checkRow}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
        <Text style={styles.checkLabel}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function FormMessage({ kind, text }: { kind: 'error' | 'info'; text: string }) {
  return (
    <View style={[styles.message, kind === 'error' ? styles.messageError : styles.messageInfo]} accessibilityLiveRegion="assertive">
      <Text style={[styles.messageText, kind === 'error' && { color: colors.danger }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  required: { color: colors.primary },
  optional: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  help: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSubtle },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: '#F3ECE5' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  chipTextSelected: { color: colors.primary, fontFamily: fonts.bodyBold },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  menuText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  boxChecked: { backgroundColor: colors.primary },
  tick: { color: colors.primaryText, fontSize: 16, fontFamily: fonts.bodyBold, lineHeight: 18 },
  checkLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  message: { borderRadius: radius.md, padding: 12 },
  messageError: { backgroundColor: '#FBEAE8' },
  messageInfo: { backgroundColor: colors.surfaceSoft },
  messageText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.text },
});
