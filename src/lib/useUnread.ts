/**
 * How many unread messages the signed-in member has. Shared by the website
 * header (red dot) and the app's bottom bar (badge on Messages).
 *
 * Re-checked when the page changes, when a conversation is read, when the
 * app or browser tab comes back into focus, and once a minute.
 */
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/lib/auth';
import { subscribeUnread, unreadCount } from '@/lib/messages';

const UNREAD_POLL_MS = 60_000;

/** `refreshKey`: pass anything that should trigger a fresh check when it changes (e.g. a menu opening). */
export function useUnread(refreshKey?: unknown): number {
  const { session } = useSession();
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    let alive = true;
    const check = () => unreadCount().then((n) => alive && setUnread(n)).catch(() => undefined);
    check();
    const timer = setInterval(check, UNREAD_POLL_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    const unsubscribe = subscribeUnread(check);
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
      unsubscribe();
    };
  }, [userId, path, refreshKey]);
  return unread;
}
