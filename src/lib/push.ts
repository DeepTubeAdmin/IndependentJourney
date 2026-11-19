/**
 * Push notifications for the phone apps (new messages only).
 *
 * The phone asks Apple/Google for a push address ("token"), and we save it
 * against the member's login in the database. When someone writes to them,
 * the database sends a notification to that address (see migration 33). The
 * notification says who wrote, never what they wrote.
 *
 * The website uses push.web.ts instead, which does nothing.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getItem, removeItem, setItem, storageReady } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const TOKEN_KEY = 'ij_push_token';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

// While the app is open: still show the banner, so a reply in another
// conversation is not missed. The tab bar's unread badge updates as well.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function pushPermission(): Promise<PushPermission> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return p.canAskAgain && p.status !== 'denied' ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Asks for permission if the member has not answered yet, then saves this
 * phone's push address. Safe to call on every app start. Returns where the
 * permission stands afterwards.
 */
export async function registerForPush(): Promise<PushPermission> {
  if (!supabase) return 'denied';
  try {
    if (Platform.OS === 'android') {
      // Android needs a channel before it will show the permission question.
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'New messages',
        importance: Notifications.AndroidImportance.HIGH,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
    let state = await pushPermission();
    if (state === 'undetermined') {
      const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
      state = asked.granted ? 'granted' : 'denied';
    }
    if (state !== 'granted') return state;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return state;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('register_push_device', { p_token: token, p_platform: Platform.OS });
    if (!error) {
      await storageReady;
      setItem(TOKEN_KEY, token);
    }
    return state;
  } catch {
    // Simulators and phones without Google Play services have no push address.
    return 'denied';
  }
}

/** Call just before signing out, so this phone stops getting that member's notifications. */
export async function unregisterPush(): Promise<void> {
  try {
    await storageReady;
    const token = getItem(TOKEN_KEY);
    if (token && supabase) await supabase.rpc('unregister_push_device', { p_token: token });
    removeItem(TOKEN_KEY);
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Signing out must always work.
  }
}

/** The number on the app icon. */
export function setAppBadge(count: number): void {
  Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => undefined);
}

/** Runs `onOpen` with the in-app address when a notification is tapped, including the one that launched the app. */
export function onPushOpened(onOpen: (url: string) => void): () => void {
  const handle = (n: Notifications.Notification) => {
    const url = n.request.content.data?.url;
    // Only ever open our own conversation screens.
    if (typeof url === 'string' && /^\/messages(\/[0-9a-f-]+)?$/i.test(url)) onOpen(url);
    Notifications.clearLastNotificationResponse();
  };
  try {
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) handle(last.notification);
  } catch {
    // Not available on this device.
  }
  const sub = Notifications.addNotificationResponseReceivedListener((r) => handle(r.notification));
  return () => sub.remove();
}

/** Runs `onArrive` when a notification comes in while the app is open. */
export function onPushReceived(onArrive: () => void): () => void {
  const sub = Notifications.addNotificationReceivedListener(() => onArrive());
  return () => sub.remove();
}
