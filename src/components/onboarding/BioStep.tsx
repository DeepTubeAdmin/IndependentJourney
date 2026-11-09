/**
 * Short bio, plus the visibility choice (surrogates) and homepage opt-in.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox, ChoiceField, FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

export function BioStep({ header, onBack, onNext }: { header: React.ReactNode; onBack: () => void; onNext: () => void }) {
  const { session, profile, refreshProfile } = useSession();
  const [bio, setBio] = useState('');
  const [visibility, setVisibility] = useState<'members_only' | 'public_previews'>('members_only');
  const [featured, setFeatured] = useState(false);
  const [lastInitial, setLastInitial] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio);
    setVisibility(profile.visibility);
    setFeatured(profile.featured_opt_in);
    setLastInitial(profile.last_initial);
  }, [profile]);

  if (!profile || !session) return null;
  const isSurrogate = profile.role === 'surrogate';

  async function save() {
    if (!supabase) return;
    if (bio.trim().length < 40) return setError('Tell people a little more: at least a few sentences (40 characters).');
    if (isSurrogate && !/^[A-Za-z]$/.test(lastInitial)) return setError('Enter the first letter of your last name.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ bio: bio.trim(), visibility, featured_opt_in: featured, ...(isSurrogate ? { last_initial: lastInitial.toUpperCase() } : {}) })
      .eq('id', session!.user.id);
    setBusy(false);
    if (err) return setError(err.message);
    await refreshProfile();
    onNext();
  }

  return (
    <Screen title="In your own words" intro="Your bio is shown on your full profile. Keep it personal and leave out last names, contact details and anything that would let someone find you off the platform.">
      {header}
      {error ? <FormMessage kind="error" text={error} /> : null}
      {isSurrogate ? (
        <TextField label="Last initial" required help="Shown as, for example, “Megan R.”" value={lastInitial} onChangeText={(v) => setLastInitial(v.slice(0, 1))} maxLength={1} autoCapitalize="characters" />
      ) : null}
      <TextField
        label="Short bio"
        required
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={1500}
        placeholder={isSurrogate ? 'Why you want to be a surrogate, a bit about your family and life, and what you hope for in a match…' : 'A bit about your family, why you are pursuing surrogacy, and what you hope for in a match…'}
      />
      <Text style={styles.counter}>{bio.length} / 1500</Text>

      {isSurrogate ? (
        <ChoiceField
          label="Who can see your limited preview?"
          help="A limited preview is your first name, state, a blurred photo, a few headline preferences and your verification label. Full profiles are only ever shown to intended parents with an active membership."
          options={[
            { value: 'members_only', label: 'Paying intended parents only (recommended)' },
            { value: 'public_previews', label: 'Also in public previews on the homepage and browse page' },
          ]}
          value={visibility}
          onChange={(v) => setVisibility(v as typeof visibility)}
        />
      ) : null}

      <Checkbox
        checked={featured}
        onChange={setFeatured}
        label="Feature my profile on the homepage once I'm verified. (Only verified profiles can be featured. Your photo would be shown unblurred there.)"
      />

      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        <Button label={busy ? 'Saving…' : 'Save and continue'} onPress={save} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { fontFamily: fonts.body, fontSize: 12, color: colors.textSubtle, textAlign: 'right', marginTop: -space.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});
