/**
 * Phone apps only: keeps push notifications working in the background of
 * every screen. Shows nothing.
 *
 *  - Once a member is signed in and has an account (never on first launch),
 *    asks to allow notifications and saves this phone for them.
 *  - Tapping a notification opens that conversation.
 *  - Keeps the number on the app icon equal to the unread message count.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/lib/auth';
import { notifyUnreadChanged } from '@/lib/messages';
import { onPushOpened, onPushReceived, registerForPush, setAppBadge } from '@/lib/push';
import { useUnread } from '@/lib/useUnread';

export function PushManager() {
  if (Platform.OS === 'web') return null;
  return <NativePush />;
}

function NativePush() {
  const { session, profile, agency } = useSession();
  const unread = useUnread();
  const userId = session?.user.id;
  const hasAccount = !!(profile || agency);

  useEffect(() => {
    if (userId && hasAccount) registerForPush();
  }, [userId, hasAccount]);

  useEffect(() => {
    if (!userId) return;
    const offOpen = onPushOpened((url) => router.navigate(url as never));
    const offReceive = onPushReceived(notifyUnreadChanged);
    return () => {
      offOpen();
      offReceive();
    };
  }, [userId]);

  useEffect(() => {
    setAppBadge(userId ? unread : 0);
  }, [userId, unread]);

  return null;
}
