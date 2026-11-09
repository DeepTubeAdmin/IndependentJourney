/**
 * Top bar on every public and member page: wordmark, main links, and either
 * Log in / Join free (visitors) or an Account menu (members).
 */
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SITE } from '@/config/settings';
import { useSession } from '@/lib/auth';
import { colors, fonts, radius, space } from '@/lib/theme';

const NAV = [
  { href: '/browse', label: 'Browse' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/resources', label: 'Resources' },
] as const;

export function SiteHeader() {
  const { session, profile, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const name = profile?.display_name || 'Account';

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Link href="/" style={styles.wordmark}>{SITE.name}</Link>
        <View style={styles.nav}>
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} style={styles.navLink}>{l.label}</Link>
          ))}
        </View>
      </View>

      {session ? (
        <View style={styles.accountWrap}>
          <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Account menu" style={({ pressed }) => [styles.accountBtn, pressed && styles.pressed]}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
            <Text style={styles.accountText} numberOfLines={1}>{name}</Text>
            <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
          </Pressable>
          {open ? (
            <View style={styles.menu}>
              {[
                { label: 'Profile', go: '/home' },
                { label: 'Messages', go: '/messages' },
                { label: 'Saved profiles', go: '/saved' },
                { label: 'Settings', go: '/settings' },
              ].map((m) => (
                <Pressable key={m.label} onPress={() => { setOpen(false); router.push(m.go as never); }} accessibilityRole="button" style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
                  <Text style={styles.menuText}>{m.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={async () => { setOpen(false); await signOut(); router.replace('/'); }} accessibilityRole="button" style={({ pressed }) => [styles.menuItem, styles.menuLast, pressed && styles.pressed]}>
                <Text style={[styles.menuText, styles.signOut]}>Sign out</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.right}>
          <Button label="Log in" variant="secondary" size="sm" onPress={() => router.push('/log-in')} />
          <Button label="Join free" size="sm" onPress={() => router.push('/join')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingVertical: space.md, flexWrap: 'wrap', zIndex: 10 },
  left: { flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' },
  wordmark: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  nav: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  navLink: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  right: { flexDirection: 'row', gap: space.xs },
  accountWrap: { position: 'relative' },
  accountBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, maxWidth: 240 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryText },
  accountText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, flexShrink: 1 },
  caret: { fontSize: 12, color: colors.textSubtle },
  menu: { position: 'absolute', top: 46, right: 0, minWidth: 200, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, zIndex: 20 },
  menuItem: { paddingHorizontal: space.md, paddingVertical: 10 },
  menuLast: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  menuText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  signOut: { color: colors.danger },
  pressed: { opacity: 0.8 },
});
