/**
 * Upload 3 to 6 photos. Stored in the private "profile-photos" bucket.
 * All your photos appear on your limited preview; the first one shows first.
 *
 * Every photo is framed by the member first (PhotoCropper): a 4:5 portrait
 * crop, shrunk to at most 1200 px wide. Existing photos can be re-framed with
 * the "Adjust" button, which replaces the stored file.
 */
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormMessage } from '@/components/form';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/auth';
import { PhotoCropper } from '@/components/photos/PhotoCropper';
import { deletePhoto, loadPhotos, replacePhoto, uploadPhoto, type Photo } from '@/lib/profile';
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
  // Photos picked from the device that still need framing, in order.
  const [queue, setQueue] = useState<{ uri: string; total: number; index: number }[]>([]);
  // An existing photo being re-framed.
  const [adjusting, setAdjusting] = useState<{ photo: Photo; uri: string } | null>(null);

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
      quality: 1, // the cropper shrinks the photo; keep the original sharp until then
      allowsMultipleSelection: true,
      selectionLimit: MAX - photos.length,
    });
    if (result.canceled) return;
    setError('');
    // Each picked photo is framed in turn, then uploaded.
    setQueue(result.assets.map((a, i) => ({ uri: a.uri, total: result.assets.length, index: i + 1 })));
  }

  /** Called by the cropper with the framed copy of the photo at the front of the queue. */
  async function framedNew(uri: string) {
    const [, ...rest] = queue;
    setQueue(rest);
    setBusy(true);
    const position = photos.length ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    const err = await uploadPhoto(profileId, uri, position);
    if (err) {
      setError(err);
      setQueue([]);
    }
    await reload();
    await refreshProfile();
    setBusy(false);
  }

  /** Opens the cropper on a photo that is already uploaded. */
  async function adjust(photo: Photo) {
    if (!photo.url) return;
    setError('');
    let uri = photo.url;
    if (Platform.OS === 'web') {
      // Load the file once so the cropper works on a local copy.
      try {
        const blob = await (await fetch(photo.url)).blob();
        uri = URL.createObjectURL(blob);
      } catch {
        return setError('We could not open that photo right now. Please try again.');
      }
    }
    setAdjusting({ photo, uri });
  }

  async function framedExisting(uri: string) {
    if (!adjusting) return;
    const { photo } = adjusting;
    setAdjusting(null);
    setBusy(true);
    const err = await replacePhoto(profileId, photo, uri);
    if (err) setError(err);
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

  // Framing a newly picked photo.
  if (queue.length > 0) {
    const cur = queue[0];
    return (
      <Screen title={managed ? 'Photos' : 'Your photos'}>
        {header}
        <PhotoCropper
          key={cur.uri}
          uri={cur.uri}
          label={cur.total > 1 ? `Photo ${cur.index} of ${cur.total}` : undefined}
          onDone={framedNew}
          onCancel={() => setQueue([])}
        />
      </Screen>
    );
  }

  // Re-framing an existing photo.
  if (adjusting) {
    return (
      <Screen title={managed ? 'Photos' : 'Your photos'}>
        {header}
        <PhotoCropper key={adjusting.photo.id} uri={adjusting.uri} onDone={framedExisting} onCancel={() => setAdjusting(null)} />
      </Screen>
    );
  }

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
            <View style={styles.tileActions}>
              <Pressable onPress={() => adjust(p)} accessibilityRole="button" accessibilityLabel="Adjust how this photo is framed" style={styles.tileBtn} disabled={busy || !p.url}>
                <Text style={styles.tileBtnText}>Adjust</Text>
              </Pressable>
              <Pressable onPress={() => remove(p)} accessibilityRole="button" accessibilityLabel="Remove this photo" style={styles.tileBtn} disabled={busy}>
                <Text style={styles.tileBtnText}>Remove</Text>
              </Pressable>
            </View>
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
      {photos.length > 0 ? <Text style={styles.count}>Face cut off on your card? Tap Adjust to re-frame a photo.</Text> : null}
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
  tileActions: { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  tileBtn: { backgroundColor: 'rgba(46,42,38,0.8)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  tileBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryText },
  addTile: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  count: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});
