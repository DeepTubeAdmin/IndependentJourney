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
import { browseProfiles, placeLabel, profileTypeLabel, verifiedLabel, type BrowseFilters, type PreviewRow } from '@/lib/browse';
import { formatDistance } from '@/lib/geo';
import { alertableFilters, saveSearch } from '@/lib/notifications';
import { colors, fonts, radius, space } from '@/lib/theme';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Browse Surrogates and Intended Parents',
    description:
      'Browse profiles of gestational surrogates and intended parents, independent members and agency clients clearly labelled. Filter by state, age, timeline and preferences. Free for everyone.',
    path: '/browse',
  });
}

const PAGE = 24;
/** Filters that mean the same thing for surrogates and intended parents. */
const SHARED_FILTERS: (keyof BrowseFilters)[] = ['state', 'verified_only', 'profile_type', 'sort', 'radius_miles', 'relationship_level', 'termination_comfort', 'start_before'];
/** Age bands for the surrogate age filter: [youngest, oldest] in whole years. */
const AGE_BANDS: Record<string, [number, number | undefined]> = { '21_29': [21, 29], '30_34': [30, 34], '35_39': [35, 39], '40_plus': [40, undefined] };
const COMFORT = [{ value: 'comfortable', label: 'Comfortable' }, { value: 'to_discuss', label: 'To discuss' }, { value: 'not_comfortable', label: 'Not comfortable' }];

export default function Browse() {
  const { session, profile, agency, loading } = useSession();
  const anon = !loading && !session;
  const isAgency = Boolean(agency) && !profile;
  // Everyone signed in can browse both sides (Seth, 15 Nov 2026). Members start
  // on the other side; agencies start on surrogates. The toggle switches.
  const [sideChoice, setSideChoice] = useState<'surrogate' | 'intended_parent' | null>(null);
  const otherSide: 'surrogate' | 'intended_parent' | null = profile?.role === 'surrogate' ? 'intended_parent' : profile?.role === 'intended_parent' ? 'surrogate' : null;
  const lookingFor: 'surrogate' | 'intended_parent' | null = sideChoice ?? otherSide ?? (isAgency ? 'surrogate' : null);
  const sameSide = Boolean(profile) && lookingFor === profile?.role;

  const [filters, setFilters] = useState<BrowseFilters>({});
  const [startMonths, setStartMonths] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  // "Save this search": name box shown under the filter bar, then a one-line confirmation.
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saveMsg, setSaveMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  // Saved-search alerts watch the other side only, so agencies and same-side browsing do not get them.
  const canSave = !isAgency && !sameSide && Object.keys(alertableFilters(filters)).length > 0;

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
    // Signed-in people see one side at a time, chosen with the toggle.
    const data = await browseProfiles(lookingFor ? { ...filters, role: lookingFor } : filters, view === 'map' ? 200 : PAGE, offset);
    setRows((r) => (offset === 0 ? data : [...r, ...data]));
    setMore(view === 'list' && data.length === PAGE);
    setBusy(false);
  }

  useEffect(() => {
    if (!loading) load(0);
  }, [loading, filters, view, session?.user.id, lookingFor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setting a filter back to "any" drops its key, so Clear and the count stay honest.
  const set = (k: keyof BrowseFilters, v: unknown) =>
    setFilters((f) => {
      const empty = v === undefined || v === null || v === '' || v === false;
      const rest = Object.entries(f).filter(([key]) => key !== k);
      return Object.fromEntries(empty ? rest : [...rest, [k, v]]) as BrowseFilters;
    });
  const activeCount = Object.keys(filters).length;
  // Each side has its own questions, so switching sides keeps only the filters that apply to both.
  function switchSide(side: 'surrogate' | 'intended_parent') {
    if (side === lookingFor) return;
    setSideChoice(side);
    setFilters((f) => Object.fromEntries(Object.entries(f).filter(([k]) => SHARED_FILTERS.includes(k as keyof BrowseFilters))) as BrowseFilters);
  }
  // "Ready to start within": turned into a date the database compares against.
  const startWithin = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };

  // The tick-box filters. They live at the top of the Filters panel, on the
  // website and in the apps, so the bar holds only buttons.
  const quickChecks = (
    <>
          <Checkbox label="Verified only" checked={Boolean(filters.verified_only)} onChange={(v) => set('verified_only', v)} />
          {profile?.journey_types === 'independent_only' ? (
            <Text style={styles.small}>Agency profiles are hidden (your journey choice, editable on your profile).</Text>
          ) : (
            <>
              <Checkbox label="Independent only" checked={filters.profile_type === 'independent'} onChange={(v) => set('profile_type', v ? 'independent' : undefined)} />
              <Checkbox label="Agency profiles only" checked={filters.profile_type === 'agency'} onChange={(v) => set('profile_type', v ? 'agency' : undefined)} />
            </>
          )}
          {lookingFor === 'intended_parent' ? <Checkbox label="US-based parents only" checked={Boolean(filters.us_only)} onChange={(v) => set('us_only', v || undefined)} /> : null}
          {myPoint ? <Checkbox label="Closest first" checked={filters.sort === 'distance'} onChange={(v) => set('sort', v ? 'distance' : undefined)} /> : null}
    </>
  );

  return (
    <Screen
      width={1200}
      title={anon ? 'A glimpse of who is here' : lookingFor === 'surrogate' ? 'Surrogates' : 'Intended parents'}
      intro={
        anon
          ? 'A first look at our members. Join free to read full profiles and get in touch.'
          : isAgency
            ? 'Browse both sides. Open a profile to write to them on behalf of one of your client profiles.'
          : sameSide
            ? `See who else is here on your side of the journey. Messages are only between surrogates and intended parents, so there is no Message button on these profiles.`
          : lookingFor === 'surrogate'
            ? 'Open any profile to read it in full. Complete your own profile to start conversations.'
            : 'You can read every intended parent’s full profile. Complete your own profile to start conversations.'
      }
    >
      {!anon ? (
        <View style={styles.filterBar}>
          <Button label="Surrogates" variant={lookingFor === 'surrogate' ? 'primary' : 'secondary'} size="sm" onPress={() => switchSide('surrogate')} />
          <Button label="Intended parents" variant={lookingFor === 'intended_parent' ? 'primary' : 'secondary'} size="sm" onPress={() => switchSide('intended_parent')} />
          <Button label={showFilters ? 'Hide filters' : activeCount > 0 ? `Filters (${activeCount})` : 'Filters'} variant="secondary" size="sm" onPress={() => setShowFilters((v) => !v)} />
          <Button label={view === 'map' ? 'List view' : 'Map view'} variant="secondary" size="sm" onPress={() => setView((v) => (v === 'map' ? 'list' : 'map'))} />
          {Object.keys(filters).length > 0 ? <Button label="Clear" variant="secondary" size="sm" onPress={() => { setFilters({}); setStartMonths(null); setAgeBand(null); }} /> : null}
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
          <View style={styles.checks}>{quickChecks}</View>
          <SelectField label="State" options={US_STATES} value={filters.state ?? null} onChange={(v) => set('state', v)} />
          {myPoint ? (
            <ChoiceField
              label="Distance from me"
              options={[{ value: '50', label: 'Within 50 mi' }, { value: '150', label: 'Within 150 mi' }, { value: '500', label: 'Within 500 mi' }]}
              value={filters.radius_miles ? String(filters.radius_miles) : null}
              onChange={(v) => set('radius_miles', v ? Number(v) : undefined)}
            />
          ) : (
            !anon && (!profile?.country || profile.country === 'US') && <Text style={styles.note}>Add your ZIP code to your profile to filter and sort by distance and to appear on the map.</Text>
          )}
          <ChoiceField
            label={lookingFor === 'surrogate' ? 'Ready to start within' : 'Hoping to start within'}
            options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }]}
            value={filters.start_before ? startMonths : null}
            onChange={(v) => { setStartMonths((v as string) ?? null); set('start_before', v ? startWithin(Number(v)) : undefined); }}
          />
          <ChoiceField
            label={lookingFor === 'surrogate' ? 'Termination for medical reasons' : 'Views on termination for medical reasons'}
            options={COMFORT}
            value={filters.termination_comfort ?? null}
            onChange={(v) => set('termination_comfort', v)}
          />
          <ChoiceField
            label="Relationship during the journey"
            options={[
              { value: 'minimal', label: 'Minimal contact' },
              { value: 'regular_updates', label: 'Regular updates' },
              { value: 'close', label: 'Close relationship' },
            ]}
            value={filters.relationship_level ?? null}
            onChange={(v) => set('relationship_level', v)}
          />
          {lookingFor === 'surrogate' ? (
            <>
              <ChoiceField
                label="Surrogate's age"
                options={[{ value: '21_29', label: '21 to 29' }, { value: '30_34', label: '30 to 34' }, { value: '35_39', label: '35 to 39' }, { value: '40_plus', label: '40 and over' }]}
                value={filters.age_min || filters.age_max ? ageBand : null}
                onChange={(v) => { const band = v ? AGE_BANDS[v as string] : undefined; setAgeBand((v as string) ?? null); set('age_min', band?.[0]); set('age_max', band?.[1]); }}
              />
              <ChoiceField
                label="Surrogacy experience"
                options={[{ value: 'first_time', label: 'First-time surrogate' }, { value: 'experienced', label: 'Experienced surrogate' }]}
                value={filters.experience ?? null}
                onChange={(v) => set('experience', v)}
              />
              <Text style={styles.small}>Experienced means she has completed at least one surrogacy journey before.</Text>
              <ChoiceField
                label="Base compensation"
                options={[{ value: '50000', label: 'Up to $50k' }, { value: '60000', label: 'Up to $60k' }, { value: '75000', label: 'Up to $75k' }]}
                value={filters.comp_max ? String(filters.comp_max) : null}
                onChange={(v) => set('comp_max', v ? Number(v) : undefined)}
              />
              <Text style={styles.small}>Includes surrogates who are open to discussing compensation.</Text>
              <ChoiceField label="Open to twins" options={[{ value: 'comfortable', label: 'Yes' }]} value={filters.open_to_twins ?? null} onChange={(v) => set('open_to_twins', v)} />
              <ChoiceField label="Open to working with" options={[{ value: 'single_parents', label: 'Single parents' }, { value: 'lgbtq_families', label: 'LGBTQ+ families' }]} value={filters.open_to_ip_type ?? null} onChange={(v) => set('open_to_ip_type', v)} />
              <View style={styles.checks}>
                <Checkbox label="OK with embryos that are not genetically tested" checked={filters.untested_embryos_ok === 'yes'} onChange={(v) => set('untested_embryos_ok', v ? 'yes' : undefined)} />
                <Checkbox label="OK with donor egg or sperm embryos" checked={filters.carry_donor_embryos === 'yes'} onChange={(v) => set('carry_donor_embryos', v ? 'yes' : undefined)} />
                <Checkbox label="Open to international parents" checked={filters.international_ips_ok === 'yes'} onChange={(v) => set('international_ips_ok', v ? 'yes' : undefined)} />
                <Checkbox label="Willing to travel" checked={filters.willing_to_travel === 'yes'} onChange={(v) => set('willing_to_travel', v ? 'yes' : undefined)} />
              </View>
            </>
          ) : (
            <>
              <ChoiceField label="Embryos" options={[{ value: 'created', label: 'Already created' }, { value: 'in_progress', label: 'In progress' }, { value: 'not_yet', label: 'Not yet' }]} value={filters.embryos_status ?? null} onChange={(v) => set('embryos_status', v)} />
              <ChoiceField label="Twins" options={[{ value: 'comfortable', label: 'Open to twins' }, { value: 'not_comfortable', label: 'One baby only' }]} value={filters.open_to_twins ?? null} onChange={(v) => set('open_to_twins', v)} />
              <ChoiceField label="Family" options={[{ value: 'couple', label: 'Couple' }, { value: 'single', label: 'Single parent' }]} value={filters.family_structure ?? null} onChange={(v) => set('family_structure', v)} />
              <View style={styles.checks}>
                <Checkbox label="Embryos are genetically tested" checked={filters.embryos_tested === 'yes'} onChange={(v) => set('embryos_tested', v ? 'yes' : undefined)} />
                <Checkbox label="Has consulted a reproductive attorney" checked={Boolean(filters.consulted_attorney)} onChange={(v) => set('consulted_attorney', v)} />
              </View>
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
              state={placeLabel(p)}
              role={p.role}
              verified={verifiedLabel(p)}
              headline={p.headline_tags.join(' · ') || 'Profile complete'}
              typeLabel={profileTypeLabel(p)}
              agency={p.profile_type === 'agency'}
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
          <Text style={styles.wallText}>This is a first look. Join free to read full profiles and send messages. Independent Journey is free for everyone.</Text>
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
  checks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.sm },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  wall: { backgroundColor: colors.surfaceSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm, alignItems: 'center' },
  wallTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  wallText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 560 },
  wallRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
});
