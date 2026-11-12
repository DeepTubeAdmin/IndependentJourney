/**
 * Your story (no length limit). Every live profile is shown publicly as a
 * limited preview, so there is no visibility choice here any more.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage, TextField } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

export function BioStep({ header, onBack, onNext }: { header: React.ReactNode; onBack: () => void; onNext: () => void }) {
  const { session, profile, refreshProfile } = useSession();
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio);
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
      .update({ bio: bio.trim() })
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

      <Text style={styles.note}>
        {isSurrogate
          ? 'Your limited preview (first name, state, photos, a few headline preferences and your verification label) is shown publicly so intended parents can find you. Your story and full answers are only shown to intended parents with an active membership.'
          : 'Your limited preview (first names, state, photos, a few headline preferences and your verification label) is shown publicly so surrogates can find you. Your story and full answers are only shown to surrogates who have joined.'}
      </Text>

      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        <Button label={busy ? 'Saving…' : 'Save and continue'} onPress={save} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: space.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});
