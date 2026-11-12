/** Renders one questionnaire field from src/config/questionnaire.ts with the matching form control. */
import { ChoiceField, DateField, MoneyField, MultiChoiceField, SelectField, TextField, YesNoField } from '@/components/form';
import { US_STATES, type Field } from '@/config/questionnaire';

export function FieldControl({ field, value, onChange, error }: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const common = { label: field.label, help: field.help, required: field.required, error };
  switch (field.type) {
    case 'date':
      return <DateField {...common} value={typeof value === 'string' ? value : ''} onChange={onChange} years={field.years ?? 'past'} />;
    case 'money':
      return <MoneyField {...common} value={value == null ? '' : String(value)} onChange={onChange} />;
    case 'text':
    case 'textarea':
    case 'number':
      return (
        <TextField
          {...common}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          multiline={field.type === 'textarea'}
          placeholder={field.placeholder}
          keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
          maxLength={field.maxLength}
        />
      );
    case 'state':
      return <SelectField {...common} options={US_STATES} value={(value as string) ?? null} onChange={onChange} />;
    case 'single':
      return <ChoiceField {...common} options={field.options ?? []} value={value == null ? null : String(value)} onChange={onChange} />;
    case 'multi':
      return <MultiChoiceField {...common} options={field.options ?? []} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'yesno':
      return <YesNoField {...common} value={typeof value === 'boolean' ? value : null} onChange={onChange} />;
  }
}
