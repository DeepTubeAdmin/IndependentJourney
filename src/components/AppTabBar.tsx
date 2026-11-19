/**
 * Bottom tab bar for the phone and tablet apps. The website keeps its top
 * header instead, so this renders nothing there.
 *
 * Members:  Home · Browse · Saved · Messages · Me
 * Agencies: Clients · Browse · Saved · Messages · Me
 * Visitors: Home · Browse · About · Join
 *
 * Hidden where a bar would get in the way: sign-up and log-in, the profile
 * questionnaire, and inside a conversation (so the typing box sits on the
 * keyboard).
 */
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useSession } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';
import { useUnread } from '@/lib/useUnread';
import { isApp } from '@/lib/platform';

type IconName = 'home' | 'browse' | 'saved' | 'messages' | 'me' | 'about' | 'join' | 'clients';
type Tab = { key: string; label: string; href: string; icon: IconName; match: (path: string) => boolean };

const starts = (...prefixes: string[]) => (path: string) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

const MEMBER_TABS: Tab[] = [
  { key: 'home', label: 'Home', href: '/home', icon: 'home', match: starts('/home') },
  { key: 'browse', label: 'Browse', href: '/browse', icon: 'browse', match: starts('/browse', '/profile') },
  { key: 'saved', label: 'Saved', href: '/saved', icon: 'saved', match: starts('/saved') },
  { key: 'messages', label: 'Messages', href: '/messages', icon: 'messages', match: starts('/messages') },
  { key: 'me', label: 'Me', href: '/me', icon: 'me', match: starts('/me', '/settings', '/membership', '/my-profile', '/how-it-works', '/resources', '/terms', '/privacy', '/disclaimer', '/s') },
];
const AGENCY_TABS: Tab[] = [
  { key: 'clients', label: 'Clients', href: '/agency', icon: 'clients', match: starts('/agency') },
  ...MEMBER_TABS.slice(1),
];
const VISITOR_TABS: Tab[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home', match: (p) => p === '/' },
  { key: 'browse', label: 'Browse', href: '/browse', icon: 'browse', match: starts('/browse', '/profile', '/s') },
  { key: 'about', label: 'About', href: '/how-it-works', icon: 'about', match: starts('/how-it-works', '/resources', '/terms', '/privacy', '/disclaimer') },
  { key: 'join', label: 'Join', href: '/join', icon: 'join', match: starts('/join', '/log-in', '/sign-up') },
];

/** Screens that take the whole display. */
function hiddenOn(path: string): boolean {
  if (starts('/log-in', '/sign-up', '/join', '/forgot-password', '/reset-password', '/confirm', '/verify-email', '/finish-sign-up', '/welcome', '/onboarding', '/admin')(path)) return true;
  if (path.startsWith('/agency/details')) return true;
  // Inside one conversation (but not the list of conversations).
  return /^\/messages\/.+/.test(path);
}

export function AppTabBar() {
  const { session, profile, agency, loading } = useSession();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  if (!isApp || loading || hiddenOn(path)) return null;

  const tabs = !session ? VISITOR_TABS : agency && !profile ? AGENCY_TABS : MEMBER_TABS;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6), paddingLeft: insets.left, paddingRight: insets.right }]} accessibilityRole="tablist">
      <View style={styles.inner}>
        {tabs.map((t) => {
          const active = t.match(path);
          const tint = active ? colors.primary : colors.textSubtle;
          const badge = t.key === 'messages' && unread > 0;
          return (
            <Pressable
              key={t.key}
              // Tapping the tab you are on does nothing; otherwise switch without stacking screens.
              onPress={() => { if (path !== t.href) router.navigate(t.href as never); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={badge ? `${t.label}, ${unread} unread` : t.label}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View>
                <Icon name={t.icon} color={tint} />
                {badge ? (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: tint }, active && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Simple line icons drawn in the brand's stroke style. */
function Icon({ name, color }: { name: IconName; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'home' ? <Path {...p} d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /> : null}
      {name === 'browse' ? (<><Circle {...p} cx={11} cy={11} r={6.5} /><Path {...p} d="M16 16l4.5 4.5" /></>) : null}
      {name === 'saved' ? <Path {...p} d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z" /> : null}
      {name === 'messages' ? <Path {...p} d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4.5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /> : null}
      {name === 'me' ? (<><Circle {...p} cx={12} cy={8.5} r={3.5} /><Path {...p} d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /></>) : null}
      {name === 'about' ? (<><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M12 11v5.5M12 7.7v.1" /></>) : null}
      {name === 'join' ? (<><Circle {...p} cx={10} cy={8.5} r={3.5} /><Path {...p} d="M3.5 20c.5-3.6 3-5.5 6.5-5.5 1.3 0 2.5.3 3.5.8M18 13v6M15 16h6" /></>) : null}
      {name === 'clients' ? (<><Circle {...p} cx={9} cy={9} r={3} /><Circle {...p} cx={16.5} cy={10} r={2.3} /><Path {...p} d="M3.5 19c.4-3 2.5-4.6 5.5-4.6s5.1 1.6 5.5 4.6M15.5 14.6c2.6-.2 4.5 1.2 5 3.9" /></>) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6 },
  // On tablets the tabs stay together in the middle instead of spreading edge to edge.
  inner: { flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  labelActive: { fontFamily: fonts.bodyBold },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.surface },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primaryText },
  pressed: { opacity: 0.6 },
});
