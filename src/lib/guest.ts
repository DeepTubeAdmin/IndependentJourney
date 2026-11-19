/**
 * Guest pass: a visitor who is not signed in may read a few full profiles
 * (admin setting "guest_full_profiles", default 3) before the join wall.
 *
 * The browser (or phone) keeps a random guest id; the database remembers which
 * profiles that id has opened and enforces the limit (see migration 31).
 * Opening the same profile again never costs another view.
 */
import { supabase } from '@/lib/supabase';

import { cachedPhotoUrls } from '@/lib/photos';
import { getItem, setItem, storageReady } from '@/lib/storage';

const KEY = 'ij_guest';

/** A random id; phones older than the built-in generator get a hand-made one. */
function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

/** The visitor's guest id, created on first use. Falls back to a per-visit id when storage is blocked. */
let memoryId: string | null = null;
export function guestId(): string {
  const stored = getItem(KEY);
  if (stored && /^[0-9a-f-]{36}$/.test(stored)) return stored;
  const fresh = newId();
  setItem(KEY, fresh);
  // If storage is blocked the value does not stick: keep one id for this visit.
  if (getItem(KEY) === fresh) return fresh;
  memoryId ??= fresh;
  return memoryId;
}

export type GuestView = {
  allowed: boolean;
  used: number;
  limit: number;
  /** Same shape the profile page uses for members' full view. */
  full?: { profile: Record<string, any>; surrogate: Record<string, any> | null; ip: Record<string, any> | null; parents: any[]; photoUrls: string[] };
};

/** Ask for a full profile on the guest pass. */
export async function guestProfileView(profileId: string): Promise<GuestView> {
  if (!supabase) return { allowed: false, used: 0, limit: 0 };
  // On phones, wait until the saved guest id has loaded so we don't mint a second one.
  await storageReady;
  const { data, error } = await supabase.rpc('guest_profile_view', { p_guest: guestId(), p_id: profileId });
  if (error || !data) return { allowed: false, used: 0, limit: 0 };
  const d = data as { allowed: boolean; used: number; limit: number; profile?: Record<string, any> };
  if (!d.allowed || !d.profile) return { allowed: false, used: d.used ?? 0, limit: d.limit ?? 0 };
  const p = d.profile;
  return {
    allowed: true,
    used: d.used,
    limit: d.limit,
    full: { profile: p, surrogate: p.surrogate ?? null, ip: p.ip ?? null, parents: p.parents ?? [], photoUrls: cachedPhotoUrls((p.photos ?? []) as string[]) },
  };
}
