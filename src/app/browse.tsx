/**
 * Browse: a vertical feed of limited previews.
 *  - Visitors see limited previews of every live profile from both sides, then a join prompt.
 *  - Surrogates see intended parents; intended parents see surrogates.
 * Filters never include protected characteristics.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox, ChoiceField, FormMessage, SelectField, TextField } from '@/components/form';
import { ProfileCard } from '@/components/ProfileCard';
import { Screen } from '@/components/Screen';
import { US_STATES } from '@/config/questionnaire';
import { useSession } from '@/lib/auth';
import { BrowseMap } from '@/components/BrowseMap';
import { browseProfiles, profileTypeLabel, type BrowseFilters, type PreviewRow } from '@/lib/browse';
import { formatDistance } from '@/lib/geo';
import { alertableFilters, saveSearch } from '@/lib/notifications';
import { colors, fonts, radius, space } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Browse Surrogates and Intended Parents',
    description:
      'Browse profiles of gestational surrogates and intended parents, independent members and agency clients clearly labelled. Filter by state, timeline and preferences. Free to look.',
    path: '/browse',
  });
}

const PAGE = 24;

export default function Browse() {
  const { session, profile, agency, loading } = useSession();
  const anon = !loading && !session;
  const isAgency = Boolean(agency) && !profile;
  // Agencies (like visitors) see both sides and pick one with the role filter.
  const [agencySide, setAgencySide] = useState<'surrogate' | 'intended_parent'>('surrogate');
  const lookingFor = profile?.role === 'surrogate' ? 'intended_parent' : profile?.role === 'intended_parent' ? 'surrogate' : isAgency ? agencySide : null;

  const [filters, setFilters] = useState<BrowseFilters>({});
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  // "Save this search": name box shown under the filter bar, then a one-line confirmation.
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saveMsg, setSaveMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const canSave = Object.keys(alertableFilters(filters)).length > 0;

  async function onSaveSearch() {
    if (!session) return;
    const err = await saveSearch(session.user.id, searchName, filters);
    setSaveMsg(err ? { kind: 'error', text: err } : { kind: 'info', text: 'Saved. We will email you when new profiles match. Manage saved searches under Settings.' });
    if (!err) { setSaving(false); setSearchName(''); }
  }
  // Where "near me" is measured from: the member's own ZIP area.
  const myPoint = profile?.approx_lat != null && profile?.approx_lng != null ? { lat: profile.approx_lat, lng: profile.approx_lng } : null;

  async function load(offset = 0) {
    setBusy(true);
    // The map wants everyone at once; the list pages.
    // An agency sees both sides; the toggle narrows to one.
    const data = await browseProfiles(isAgency ? { ...filters, role: agencySide } : filters, view === 'map' ? 200 : PAGE, offset);
    setRows((r) => (offset === 0 ? data : [...r, ...data]));
    setMore(view === 'list' && data.length === PAGE);
    setBusy(false);
  }

  useEffect(() => {
    if (!loading) load(0);
  }, [loading, filters, view, session?.user.id, isAgency, agencySide]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof BrowseFilters, v: unknown) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <Screen
      width={1200}
      title={anon ? 'A glimpse of who is here' : lookingFor === 'surrogate' ? 'Surrogates' : 'Intended parents'}
      intro={
        anon
          ? 'Limited previews of our members. Join free to open full profiles and get in touch.'
          : isAgency
            ? 'Browse both sides. Open a profile to write to them on behalf of one of your client profiles.'
          : lookingFor === 'surrogate'
            ? 'Limited previews are free. A membership unlocks full profiles and messaging.'
            : 'You can read every intended parent’s full profile. Complete your own profile to start conversations.'
      }
    >
      {!anon ? (
        <View style={styles.filterBar}>
          {isAgency ? (
            <>
              <Button label="Surrogates" variant={agencySide === 'surrogate' ? 'primary' : 'secondary'} size="sm" onPress={() => setAgencySide('surrogate')} />
              <Button label="Intended parents" variant={agencySide === 'intended_parent' ? 'primary' : 'secondary'} size="sm" onPress={() => setAgencySide('intended_parent')} />
            </>
          ) : null}
          <Button label={showFilters ? 'Hide filters' : 'Filters'} variant="secondary" size="sm" onPress={() => setShowFilters((v) => !v)} />
          <Checkbox label="Verified only" checked={Boolean(filters.verified_only)} onChange={(v) => set('verified_only', v)} />
          <Checkbox label="Independent only" checked={filters.profile_type === 'independent'} onChange={(v) => set('profile_type', v ? 'independent' : undefined)} />
          <Checkbox label="Agency profiles only" checked={filters.profile_type === 'agency'} onChange={(v) => set('profile_type', v ? 'agency' : undefined)} />
          {myPoint ? <Checkbox label="Closest first" checked={filters.sort === 'distance'} onChange={(v) => set('sort', v ? 'distance' : undefined)} /> : null}
          <Button label={view === 'map' ? 'List view' : 'Map view'} variant="secondary" size="sm" onPress={() => setView((v) => (v === 'map' ? 'list' : 'map'))} />
          {Object.keys(filters).length > 0 ? <Button label="Clear" variant="secondary" size="sm" onPress={() => setFilters({})} /> : null}
          {canSave ? <Button label="Save this search" variant="secondary" size="sm" onPress={() => { setSaving((v) => !v); setSaveMsg(null); }} /> : null}
        </View>
      ) : null}

      {saving && canSave && !anon ? (
        <View style={styles.saveBox}>
          <TextField label="Name this search" placeholder="e.g. Texas, verified" value={searchName} onChangeText={setSearchName} />
          <View style={styles.filterBar}>
            <Button label="Save and alert me" size="sm" onPress={onSaveSearch} />
            <Button label="Cancel" variant="secondary" size="sm" onPress={() => setSaving(false)} />
          </View>
        </View>
      ) : null}
      {saveMsg ? <FormMessage kind={saveMsg.kind} text={saveMsg.text} /> : null}

      {showFilters && !anon ? (
        <View style={styles.filters}>
          <SelectField label="State" options={US_STATES} value={filters.state ?? null} onChange={(v) => set('state', v)} />
          {myPoint ? (
            <ChoiceField
              label="Distance from me"
              options={[{ value: '50', label: 'Within 50 mi' }, { value: '150', label: 'Within 150 mi' }, { value: '500', label: 'Within 500 mi' }]}
              value={filters.radius_miles ? String(filters.radius_miles) : null}
              onChange={(v) => set('radius_miles', v ? Number(v) : undefined)}
            />
          ) : (
            !anon && <Text style={styles.note}>Add your ZIP code to your profile to filter and sort by distance and to appear on the map.</Text>
          )}
          <ChoiceField
            label="Relationship during the journey"
            options={[
              { value: 'minimal', label: 'Minimal' },
              { value: 'regular_updates', label: 'Regular updates' },
              { value: 'close', label: 'Close' },
            ]}
            value={filters.relationship_level ?? null}
            onChange={(v) => set('relationship_level', v)}
          />
          {lookingFor === 'surrogate' ? (
            <>
              <ChoiceField label="Open to twins" options={[{ value: 'comfortable', label: 'Yes' }]} value={filters.open_to_twins ?? null} onChange={(v) => set('open_to_twins', v)} />
              <ChoiceField label="Willing to travel" options={[{ value: 'yes', label: 'Yes' }, { value: 'discuss_later', label: 'Open to discuss' }]} value={filters.willing_to_travel ?? null} onChange={(v) => set('willing_to_travel', v)} />
              <Checkbox label="Open to discussing compensation" checked={Boolean(filters.compensation_open)} onChange={(v) => set('compensation_open', v)} />
            </>
          ) : (
            <>
              <ChoiceField label="Embryos" options={[{ value: 'created', label: 'Already created' }, { value: 'in_progress', label: 'In progress' }, { value: 'not_yet', label: 'Not yet' }]} value={filters.embryos_status ?? null} onChange={(v) => set('embryos_status', v)} />
              <ChoiceField label="Family" options={[{ value: 'couple', label: 'Couple' }, { value: 'single', label: 'Single parent' }]} value={filters.family_structure ?? null} onChange={(v) => set('family_structure', v)} />
            </>
          )}
        </View>
      ) : null}

      {view === 'map' ? (
        <BrowseMap rows={rows} center={myPoint} onOpen={(id) => router.push(`/profile/${id}`)} />
      ) : (
        <View style={styles.grid}>
          {rows.map((p) => (
            <ProfileCard
              key={p.id}
              name={p.display_name}
              state={p.state}
              role={p.role}
              verified={p.is_verified}
              headline={p.headline_tags.join(' · ') || 'Profile complete'}
              typeLabel={profileTypeLabel(p)}
              photoUrl={p.photo_url}
              photoUrls={p.photo_urls}
              meta={[formatDistance(p.distance_miles), p.recently_active === false ? 'Not active recently' : null].filter(Boolean).join(' · ') || undefined}
              onPress={() => router.push(`/profile/${p.id}`)}
            />
          ))}
        </View>
      )}

      {busy ? <Text style={styles.note}>Loading…</Text> : null}
      {!busy && rows.length === 0 ? <Text style={styles.note}>{anon ? 'No profiles yet. Join free to be the first.' : 'No profiles match yet. Try fewer filters, or check back soon.'}</Text> : null}

      {anon ? (
        <View style={styles.wall}>
          <Text style={styles.wallTitle}>See everyone</Text>
          <Text style={styles.wallText}>These are limited previews. Surrogates always join free and see full intended-parent profiles; intended parents join free and unlock full profiles and messaging with a membership.</Text>
          <View style={styles.wallRow}>
            <Button label="Join free" onPress={() => router.push('/join')} />
            <Button label="Log in" variant="secondary" onPress={() => router.push('/log-in')} />
          </View>
        </View>
      ) : null}
      {more ? <Button label="Show more" variant="secondary" onPress={() => load(rows.length)} disabled={busy} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  saveBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: space.sm, maxWidth: 480 },
  filters: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.textSubtle, textAlign: 'center' },
  wall: { backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm, alignItems: 'center' },
  wallTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  wallText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 560 },
  wallRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
});
