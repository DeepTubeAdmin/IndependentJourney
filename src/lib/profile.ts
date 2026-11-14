/**
 * Reading and saving profile answers, photos and consents.
 */

import type { Field, Step } from '@/config/questionnaire';
import { setLocationFromZip } from '@/lib/geo';
import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

export type Answers = Record<string, unknown>;

type TableName = Field['table'];

/** Loads every table the questionnaire touches into one flat { key: value } map. */
export async function loadAnswers(userId: string, steps: Step[]): Promise<Answers> {
  if (!supabase) return {};
  const tables = Array.from(new Set(steps.flatMap((s) => s.fields.map((f) => f.table))));
  const answers: Answers = {};
  await Promise.all(
    tables.map(async (table) => {
      if (table === 'ip_parents') {
        // One row per parent, flattened to parent1_* / parent2_* keys.
        const { data } = await supabase!.from('ip_parents').select('position, first_name, age').eq('profile_id', userId);
        for (const row of data ?? []) {
          answers[`parent${row.position}_first_name`] = row.first_name;
          answers[`parent${row.position}_age`] = row.age;
        }
        return;
      }
      const { data } = await supabase!.from(table).select('*').eq('id', userId).maybeSingle();
      if (data) Object.assign(answers, data as Record<string, unknown>);
    }),
  );
  return answers;
}

/**
 * Saves one step's answers, grouped by table so each table gets one update.
 * Also refreshes profiles.headline_tags from every field that defines one.
 */
export async function saveStep(userId: string, step: Step, allSteps: Step[], answers: Answers): Promise<string | null> {
  if (!supabase) return 'The app is not connected to a database yet.';
  const byTable = new Map<TableName, Record<string, unknown>>();
  for (const f of step.fields) {
    if (!(f.key in answers)) continue;
    const row = byTable.get(f.table) ?? {};
    row[f.key] = normalize(f, answers[f.key]);
    byTable.set(f.table, row);
  }

  // Headline tags: short phrases shown on preview cards.
  const tags = allSteps
    .flatMap((s) => s.fields)
    .map((f) => (f.headlineTag ? f.headlineTag(answers[f.key]) : null))
    .filter((t): t is string => Boolean(t))
    .slice(0, 3);
  // Agency details save to the agencies table only; member steps also refresh the profile row.
  if (!byTable.has('agencies')) {
    const profileRow = byTable.get('profiles') ?? {};
    profileRow.headline_tags = tags;
    // The public "last initial" (e.g. "Megan R.") comes from the private last name.
    const lastName = byTable.get('profile_private')?.last_name;
    if (typeof lastName === 'string' && lastName.trim()) profileRow.last_initial = lastName.trim().slice(0, 1).toUpperCase();
    byTable.set('profiles', profileRow);
  }

  // ZIP code: must be 5 digits and known, and becomes the approximate map point.
  const zip = byTable.get('profile_private')?.zip;
  if (typeof zip === 'string' && zip !== '' && !/^[0-9]{5}$/.test(zip)) return 'Enter a 5-digit ZIP code.';

  for (const [table, row] of byTable) {
    if (table === 'ip_parents') {
      const err = await saveParents(userId, row);
      if (err) return err;
      continue;
    }
    const { error } = await supabase.from(table).update(row).eq('id', userId);
    if (error) return error.message;
  }
  if (typeof zip === 'string' && zip !== '') {
    const err = await setLocationFromZip(userId, zip);
    if (err) return err;
  }
  return null;
}

/** Parents live in their own table: one row per parent, position 1 and 2. A blank name removes that parent. */
async function saveParents(userId: string, row: Record<string, unknown>): Promise<string | null> {
  for (const position of [1, 2] as const) {
    const name = String(row[`parent${position}_first_name`] ?? '').trim();
    const age = row[`parent${position}_age`];
    if (!name) {
      const { error } = await supabase!.from('ip_parents').delete().eq('profile_id', userId).eq('position', position);
      if (error) return error.message;
      continue;
    }
    const { error } = await supabase!
      .from('ip_parents')
      .upsert({ profile_id: userId, position, first_name: name, age: typeof age === 'number' ? age : null }, { onConflict: 'profile_id,position' });
    if (error) return error.message;
  }
  return null;
}

function normalize(field: Field, value: unknown): unknown {
  // A blank answer (never typed, or loaded back from the database as null) saves as empty, never as 0.
  if (value === '' || value === undefined || value === null) return field.type === 'text' || field.type === 'textarea' ? '' : null;
  if (field.type === 'number' || field.type === 'money') {
    const n = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (field.boolean && typeof value === 'string') return value === 'true';
  return value;
}

/** Simple client-side checks before saving a step. Returns { key: message }. */
export function validateStep(step: Step, answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of step.fields) {
    const v = answers[f.key];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (f.required && empty) errors[f.key] = 'Please answer this one.';
    if (f.type === 'date' && typeof v === 'string' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[f.key] = 'Pick a month, day and year.';
    if (f.key === 'date_of_birth' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const age = yearsSince(v);
      if (age < 21) errors[f.key] = 'Surrogates must be 21 or older.';
    }
    if (f.key === 'phone' && typeof v === 'string' && v && v.replace(/\D/g, '').length < 10) errors[f.key] = 'Enter a 10-digit US mobile number.';
    if (f.key === 'website' && typeof v === 'string' && v && !/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v.trim())) errors[f.key] = 'Enter your website address, like www.youragency.com.';
    if (f.key === 'attested_consent' && v !== true) errors[f.key] = 'We can only list agencies that confirm this.';
    if (f.key === 'year_founded' && !empty && !(Number(v) >= 1950 && Number(v) <= new Date().getFullYear())) errors[f.key] = 'Enter a four-digit year.';
    if (f.maxLength && typeof v === 'string' && v.length > f.maxLength) errors[f.key] = `Keep this under ${f.maxLength} characters.`;
    if (f.key.endsWith('_age') && !empty) {
      const n = Number(String(v).replace(/[^0-9]/g, ''));
      if (!(n >= 18 && n <= 99)) errors[f.key] = 'Enter an age between 18 and 99.';
    }
  }
  // A partner's name needs an age too (both show on the profile together).
  if (typeof answers.parent2_first_name === 'string' && answers.parent2_first_name.trim() && step.fields.some((f) => f.key === 'parent2_age')) {
    const a = answers.parent2_age;
    if (a === undefined || a === null || a === '') errors.parent2_age = "Add your partner's age, or leave the name blank.";
  }
  return errors;
}

export function yearsSince(isoDate: string): number {
  const d = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age;
}

export async function recordConsents(userId: string, version: string) {
  if (!supabase) return;
  await supabase.from('consents').insert(
    ['terms', 'privacy', 'disclaimer', 'message_review'].map((document) => ({ user_id: userId, document, version })),
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
export type Photo = { id: number; storage_path: string; position: number; url?: string };

export async function loadPhotos(userId: string): Promise<Photo[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('photos').select('id, storage_path, position').eq('profile_id', userId).order('position');
  const photos = (data ?? []) as Photo[];
  if (photos.length === 0) return photos;
  const { data: signed } = await supabase.storage
    .from('profile-photos')
    .createSignedUrls(
      photos.map((p) => p.storage_path),
      60 * 60,
    );
  return photos.map((p, i) => ({ ...p, url: signed?.[i]?.signedUrl ?? undefined }));
}

/**
 * Saves a framed photo (see PhotoCropper) to storage and the photos table.
 * Photos arrive already cropped and shrunk, always as JPEG.
 */
export async function uploadPhoto(userId: string, uri: string, position: number): Promise<string | null> {
  if (!supabase) return 'Not connected to storage.';
  const path = await storePhotoFile(userId, uri, position);
  if (typeof path !== 'string') return path.error;
  const { error } = await supabase.from('photos').insert({ profile_id: userId, storage_path: path, position });
  if (error) return error.message;
  return null;
}

/**
 * Replaces an existing photo with a re-framed copy. The photo keeps its place
 * in the order; the old file is removed afterwards. Returns an error or null.
 */
export async function replacePhoto(userId: string, photo: Photo, uri: string): Promise<string | null> {
  if (!supabase) return 'Not connected to storage.';
  const path = await storePhotoFile(userId, uri, photo.position);
  if (typeof path !== 'string') return path.error;
  const { error } = await supabase.from('photos').update({ storage_path: path }).eq('id', photo.id);
  if (error) return error.message;
  await supabase.storage.from('profile-photos').remove([photo.storage_path]);
  return null;
}

/** Uploads one image file and returns its storage path (or an error). */
async function storePhotoFile(userId: string, uri: string, position: number): Promise<string | { error: string }> {
  if (!supabase) return { error: 'Not connected to storage.' };
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${position}.${ext}`;
  const { error } = await supabase.storage.from('profile-photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  return error ? { error: error.message } : path;
}

export async function deletePhoto(photo: Photo) {
  if (!supabase) return;
  await supabase.storage.from('profile-photos').remove([photo.storage_path]);
  await supabase.from('photos').delete().eq('id', photo.id);
}

/**
 * Deletes the signed-in member's account for good: photo files first (the
 * browser can remove its own storage folder), then the database function
 * removes the login and everything attached to it. Returns an error message
 * or null. The caller signs out afterwards.
 */
export async function deleteMyAccount(userId: string, reason: string): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { data: files } = await supabase.storage.from('profile-photos').list(userId);
  if (files && files.length > 0) {
    await supabase.storage.from('profile-photos').remove(files.map((f) => `${userId}/${f.name}`));
  }
  const { error } = await supabase.rpc('delete_my_account', { p_reason: reason.trim().slice(0, 500) });
  return error ? error.message : null;
}

/**
 * "Download a copy of your data": everything we hold about the signed-in
 * member, as one JSON document. On the web it downloads a file; on the phone
 * apps it opens the share sheet so it can be saved or sent anywhere.
 */
export async function exportMyData(): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) return error.message;
  const text = JSON.stringify(data, null, 2);
  const fileName = `independent-journey-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: text, title: fileName });
  }
  return null;
}
