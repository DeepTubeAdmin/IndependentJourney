/**
 * Supabase client, shared by the whole app.
 *
 * The URL and the public "anon" key come from environment variables. The anon
 * key is safe to ship in the app because row-level security in the database
 * decides what each user can read or write. NEVER put the service-role key in
 * the app; it belongs only in Supabase Edge Functions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Trim stray spaces or quotes that sometimes get pasted into dashboard settings.
const clean = (v: string | undefined) => (v ?? '').trim().replace(/^["']|["']$/g, '');
const supabaseUrl = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// The URL must look like https://xxxx.supabase.co. If it doesn't, we warn and
// run without Supabase instead of crashing the build.
const urlLooksValid = /^https?:\/\/[^\s/]+/.test(supabaseUrl);
if (supabaseUrl && !urlLooksValid) {
  console.warn(`EXPO_PUBLIC_SUPABASE_URL is not a valid URL (got "${supabaseUrl}"). Supabase is disabled.`);
}

export const isSupabaseConfigured = Boolean(urlLooksValid && supabaseAnonKey);

// During the static web build there is no browser, so we skip session storage.
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: isServerRender ? undefined : AsyncStorage,
        autoRefreshToken: !isServerRender,
        persistSession: !isServerRender,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
