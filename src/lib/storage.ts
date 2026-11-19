/**
 * Small "remember this on the device" store that works the same on the
 * website and in the phone apps.
 *
 * On the website it is the browser's localStorage. Phones have no
 * localStorage, so there we keep a copy in memory and save every change to
 * the phone's own storage (AsyncStorage). The copy is loaded once when the
 * app starts; `storageReady` resolves when it has been.
 *
 * Only for small, non-secret values whose keys start with "ij_" (guest pass
 * id, unsent message drafts, "welcome note seen"). Login sessions are stored
 * separately by the Supabase client.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFIX = 'ij_';
const isWeb = Platform.OS === 'web';
const memory = new Map<string, string>();

/** Resolves once saved values are available. Immediate on the website. */
export const storageReady: Promise<void> = isWeb
  ? Promise.resolve()
  : AsyncStorage.getAllKeys()
      .then((keys) => AsyncStorage.multiGet(keys.filter((k) => k.startsWith(PREFIX))))
      .then((pairs) => {
        // Values set before loading finished are newer: keep them.
        for (const [k, v] of pairs) if (v != null && !memory.has(k)) memory.set(k, v);
      })
      .catch(() => undefined);

export function getItem(key: string): string | null {
  if (!isWeb) return memory.get(key) ?? null;
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (!isWeb) {
    memory.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => undefined);
    return;
  }
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* private browsing: nothing is remembered */
  }
}

export function removeItem(key: string): void {
  if (!isWeb) {
    memory.delete(key);
    AsyncStorage.removeItem(key).catch(() => undefined);
    return;
  }
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Every saved key that starts with the given text. */
export function keysWithPrefix(prefix: string): string[] {
  if (!isWeb) return [...memory.keys()].filter((k) => k.startsWith(prefix));
  try {
    const ls = globalThis.localStorage;
    if (!ls) return [];
    const out: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith(prefix)) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}
