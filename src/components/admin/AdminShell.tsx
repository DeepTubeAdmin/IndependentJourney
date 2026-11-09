/**
 * Frame for every admin page: wordmark, section links, wide content column.
 */
import { Link, usePathname } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SITE } from '@/config/settings';
import { colors, fonts, radius, space } from '@/lib/theme';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/flags', label: 'Flags' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/security', label: 'Security' },
] as const;

export function AdminShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Link href="/" style={styles.wordmark}>
            {SITE.name}
          </Link>
          <Text style={styles.adminTag}>Admin</Text>
        </View>
        <View style={styles.nav} accessibilityRole="tablist">
          {LINKS.map((l) => {
            const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} style={[styles.navLink, active && styles.navActive]}>
                {l.label}
              </Link>
            );
          })}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        <View style={styles.body}>{children}</View>
      </View>
    </ScrollView>
  );
}

/** Small boxed section used on admin pages. */
export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

/** Key: value line. */
export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v === null || v === undefined || v === '' ? '—' : String(v)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.md, paddingBottom: space.xxl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 1040, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wordmark: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  adminTag: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.secondary, backgroundColor: colors.surfaceSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  navLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  navActive: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colors.text, marginTop: space.sm },
  intro: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 22, marginTop: -space.sm },
  body: { gap: space.md },
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  panelTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: space.xs },
  kv: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  k: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSubtle, minWidth: 180 },
  v: { fontFamily: fonts.body, fontSize: 14, color: colors.text, flex: 1, minWidth: 160 },
});
