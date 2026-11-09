/**
 * Turns a US ZIP code into an APPROXIMATE point (the ZIP area's centre,
 * rounded to about 0.7 miles). We never store or show an exact address.
 * The lookup table is loaded only when needed (it is large).
 */
import { supabase } from '@/lib/supabase';

export type LatLng = { lat: number; lng: number };

export async function lookupZip(zip: string): Promise<LatLng | null> {
  if (!/^[0-9]{5}$/.test(zip)) return null;
  const table = (await import('@/data/zip-centroids.json')).default as unknown as Record<string, [number, number]>;
  const hit = table[zip];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/** Saves the member's approximate location from their ZIP. Returns an error message or null. */
export async function setLocationFromZip(userId: string, zip: string): Promise<string | null> {
  if (!supabase) return 'Not connected.';
  const point = await lookupZip(zip);
  if (!point) return 'We don\u2019t recognize that ZIP code. Please check it.';
  const { error } = await supabase.from('profiles').update({ approx_lat: point.lat, approx_lng: point.lng }).eq('id', userId);
  return error ? error.message : null;
}

export function formatDistance(miles: number | null | undefined): string | null {
  if (miles == null) return null;
  if (miles < 1) return 'Under a mile away';
  return `About ${Math.round(miles)} mi away`;
}
