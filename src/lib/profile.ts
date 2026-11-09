/**
 * Reading and saving profile answers, photos and consents.
 */

import type { Field, Step } from '@/config/questionnaire';
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
  const profileRow = byTable.get('profiles') ?? {};
  profileRow.headline_tags = tags;
  byTable.set('profiles', profileRow);

  for (const [table, row] of byTable) {
    const { error } = await supabase.from(table).update(row).eq('id', userId);
    if (error) return error.message;
  }
  return null;
}

function normalize(field: Field, value: unknown): unknown {
  if (value === '' || value === undefined) return field.type === 'text' || field.type === 'textarea' ? '' : null;
  if (field.type === 'number') {
    const n = Number(value);
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
    if (f.type === 'date' && typeof v === 'string' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[f.key] = 'Use the format YYYY-MM-DD.';
    if (f.key === 'date_of_birth' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const age = yearsSince(v);
      if (age < 21) errors[f.key] = 'Surrogates must be 21 or older.';
    }
    if (f.key === 'phone' && typeof v === 'string' && v && v.replace(/\D/g, '').length < 10) errors[f.key] = 'Enter a 10-digit US mobile number.';
    if (f.maxLength && typeof v === 'string' && v.length > f.maxLength) errors[f.key] = `Keep this under ${f.maxLength} characters.`;
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

export async function uploadPhoto(userId: string, uri: string, position: number): Promise<string | null> {
  if (!supabase) return 'Not connected to storage.';
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${position}.${ext}`;
  const { error: upErr } = await supabase.storage.from('profile-photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (upErr) return upErr.message;
  const { error } = await supabase.from('photos').insert({ profile_id: userId, storage_path: path, position });
  if (error) return error.message;
  return null;
}

export async function deletePhoto(photo: Photo) {
  if (!supabase) return;
  await supabase.storage.from('profile-photos').remove([photo.storage_path]);
  await supabase.from('photos').delete().eq('id', photo.id);
}
