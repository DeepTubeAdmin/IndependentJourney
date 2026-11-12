/**
 * Upload 3 to 6 photos. Stored in the private "profile-photos" bucket.
 * All your photos appear on your limited preview; the first one shows first.
 */
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { deletePhoto, loadPhotos, uploadPhoto, type Photo } from '@/lib/profile';
import type { StepProps } from '@/components/onboarding/stepProps';
import { colors, fonts, radius, space } from '@/lib/theme';

const MIN = 3;
const MAX = 6;

export function PhotosStep({ profileId, managed, refresh, header, onBack, onNext }: StepProps & { onNext: () => void }) {
  const { session } = useSession();
  const refreshProfile = refresh;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (session) setPhotos(await loadPhotos(profileId));
  }, [session, profileId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add() {
    if (!session) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('We need permission to open your photos.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: MAX - photos.length,
    });
    if (result.canceled) return;
    setBusy(true);
    setError('');
    let position = photos.length ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    for (const asset of result.assets) {
      const err = await uploadPhoto(profileId, asset.uri, position++);
      if (err) {
        setError(err);
        break;
      }
    }
    await reload();
    await refreshProfile();
    setBusy(false);
  }

  async function remove(photo: Photo) {
    setBusy(true);
    if (session) await deletePhoto(photo);
    await reload();
    await refreshProfile();
    setBusy(false);
  }

  const enough = photos.length >= MIN;

  return (
    <Screen
      title={managed ? 'Photos' : 'Your photos'}
      intro={managed
        ? `Add at least ${MIN} photos (up to ${MAX}) that your client has agreed to share. No children's faces, please.`
        : `Add at least ${MIN} photos (up to ${MAX}). Clear, recent photos of you${'—'}and your partner or family if you like. No children's faces, please.`}
    >
      {header}
      {error ? <FormMessage kind="error" text={error} /> : null}
      <View style={styles.grid}>
        {photos.map((p) => (
          <View key={p.id} style={styles.tile}>
            {p.url ? <Image source={{ uri: p.url }} style={styles.img} accessibilityLabel="Your profile photo" /> : <View style={styles.img} />}
            <Pressable onPress={() => remove(p)} accessibilityRole="button" accessibilityLabel="Remove this photo" style={styles.remove} disabled={busy}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < MAX ? (
          <Pressable onPress={add} accessibilityRole="button" style={[styles.tile, styles.addTile]} disabled={busy}>
            <Text style={styles.addText}>{busy ? 'Uploading…' : '+ Add photo'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.count}>
        {photos.length} of {MIN} required{photos.length >= MIN ? ' ✓' : ''}
      </Text>
      <View style={styles.nav}>
        <Button label="Back" variant="secondary" onPress={onBack} />
        <Button label="Continue" onPress={onNext} disabled={!enough || busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: 150, height: 190, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  img: { width: '100%', height: '100%' },
  remove: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(46,42,38,0.8)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  removeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryText },
  addTile: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  count: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});
