/**
 * Your story (no length limit), plus the visibility choice and homepage opt-in.
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio);
    setVisibility(profile.visibility);
    setFeatured(profile.featured_opt_in);
  }, [profile]);

  if (!profile || !session) return null;
  const isSurrogate = profile.role === 'surrogate';

  async function save() {
    if (!supabase) return;
    if (bio.trim().length < 40) return setError('Tell people a little more: at least a few sentences (40 characters).');
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ bio: bio.trim(), visibility, featured_opt_in: featured })
      .eq('id', session!.user.id);
    setBusy(false);
    if (err) return setError(err.message);
    await refreshProfile();
    onNext();
  }

  return (
    <Screen title="In your own words" intro="Your story is shown on your full profile. Keep it personal and leave out last names, contact details and anything that would let someone find you off the platform.">
      {header}
      {error ? <FormMessage kind="error" text={error} /> : null}
      <TextField
        label="Tell your story"
        help="There is no length limit. The more you share, the easier it is for the right match to recognise you."
        required
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder={isSurrogate ? 'Why you want to be a surrogate, a bit about your family and life, and what you hope for in a match…' : 'A bit about your family, why you are pursuing surrogacy, and what you hope for in a match…'}
      />

      <ChoiceField
        label="Who can see your limited preview?"
        help={
          isSurrogate
            ? 'A limited preview is your first name, state, your first photo, a few headline preferences and your verification label. Full profiles are only ever shown to intended parents with an active membership.'
            : 'A limited preview is your first names, state, photo, a few headline preferences and your verification label. Full profiles are shown to surrogates who have joined.'
        }
        options={[
          { value: 'members_only', label: isSurrogate ? 'Members only (recommended)' : 'Members only' },
          { value: 'public_previews', label: 'Also in public previews on the homepage and browse page (visitors see up to 5 previews)' },
        ]}
        value={visibility}
        onChange={(v) => setVisibility(v as typeof visibility)}
      />

      <Checkbox
        checked={featured}
        onChange={setFeatured}
        label="Feature my profile on the homepage once I'm verified. (Only verified profiles can be featured.)"
      />

      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        <Button label={busy ? 'Saving…' : 'Save and continue'} onPress={save} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({

  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});
