import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';
import { storage } from '@/src/utils/storage';

const FILTERS = ['All', 'Vedic', 'Tarot', 'Numerology', 'Palmistry', 'Face Reading', 'KP System'];
const GENDERS = [
  { key: 'all',    label: 'All',    icon: 'people' as const },
  { key: 'female', label: 'Female', icon: 'female' as const },
  { key: 'male',   label: 'Male',   icon: 'male' as const },
];
const LANGUAGES = ['All', 'English', 'Hindi', 'Spanish', 'Mandarin', 'Portuguese', 'Marathi'];
const SORTS = [
  { key: 'trending',   label: 'Trending', icon: 'flame' as const },
  { key: 'rating',     label: 'Top rated', icon: 'star' as const },
  { key: 'experience', label: 'Experience', icon: 'ribbon' as const },
  { key: 'price_asc',  label: 'Price ↑',    icon: 'trending-up' as const },
];

const PRICE_MIN = 5;
const PRICE_MAX = 50;
const STORAGE_KEY = 'aura_astro_filters_v2';

type Gender = 'all' | 'female' | 'male';
type SortKey = 'trending' | 'rating' | 'experience' | 'price_asc';

type PersistedFilters = {
  filter: string;
  gender: Gender;
  language: string;
  price: [number, number];
  freeOnly: boolean;
  sort: SortKey;
};

const DEFAULTS: PersistedFilters = {
  filter: 'All', gender: 'all', language: 'All',
  price: [PRICE_MIN, PRICE_MAX], freeOnly: false, sort: 'rating',
};

if (Platform.OS === 'android') {
  // no-op — LayoutAnimation replaced by bottom sheet
}

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function Astrologers() {
  return (
    <BottomSheetModalProvider>
      <AstrologersInner />
    </BottomSheetModalProvider>
  );
}

function AstrologersInner() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ specialty?: string; freeOnly?: string }>();

  const [filter, setFilter] = useState<string>(DEFAULTS.filter);
  const [gender, setGender] = useState<Gender>(DEFAULTS.gender);
  const [language, setLanguage] = useState<string>(DEFAULTS.language);
  const [price, setPrice] = useState<[number, number]>(DEFAULTS.price);
  const [freeOnly, setFreeOnly] = useState<boolean>(DEFAULTS.freeOnly);
  const [sort, setSort] = useState<SortKey>(DEFAULTS.sort);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [hydrated, setHydrated] = useState(false);

  const [astros, setAstros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydrate saved filters
  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(STORAGE_KEY, '');
      if (raw) {
        try {
          const p = JSON.parse(raw) as PersistedFilters;
          if (p.filter) setFilter(p.filter);
          if (p.gender) setGender(p.gender);
          if (p.language) setLanguage(p.language);
          if (Array.isArray(p.price) && p.price.length === 2) setPrice([p.price[0], p.price[1]]);
          if (typeof p.freeOnly === 'boolean') setFreeOnly(p.freeOnly);
          if (p.sort) setSort(p.sort);
        } catch {}
      }
      setHydrated(true);
    })();
  }, []);

  // Deep-link overrides: applied AFTER hydration
  useEffect(() => {
    if (!hydrated) return;
    if (params.specialty && FILTERS.includes(String(params.specialty))) {
      setFilter(String(params.specialty));
    }
    if (params.freeOnly === 'true') {
      setFreeOnly(true);
      bottomSheetRef.current?.present();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, params.specialty, params.freeOnly]);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedFilters = { filter, gender, language, price, freeOnly, sort };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, filter, gender, language, price, freeOnly, sort]);

  // Fetch
  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    const qs = new URLSearchParams();
    if (filter !== 'All') qs.set('specialty', filter);
    if (gender !== 'all') qs.set('gender', gender);
    if (language !== 'All') qs.set('language', language);
    if (price[0] > PRICE_MIN) qs.set('min_price', String(price[0]));
    if (price[1] < PRICE_MAX) qs.set('max_price', String(price[1]));
    if (freeOnly) qs.set('free_only', 'true');
    if (sort !== 'rating') qs.set('sort', sort);
    const s = qs.toString();
    api.get(`/api/astrologers${s ? `?${s}` : ''}`)
      .then(setAstros)
      .finally(() => setLoading(false));
  }, [hydrated, filter, gender, language, price, freeOnly, sort]);

  // "Filters" badge counts only true filter dimensions.
  // Sort has its own independent gold indicator on the Sort pill, so it's excluded here.
  const activeExtra =
    (gender !== 'all' ? 1 : 0) +
    (language !== 'All' ? 1 : 0) +
    (price[0] > PRICE_MIN || price[1] < PRICE_MAX ? 1 : 0) +
    (freeOnly ? 1 : 0);

  // A superset used by the clear-all "×" and the active-chip row (includes sort).
  const anyFilterActive = activeExtra > 0 || sort !== 'rating';

  const resetAll = useCallback(() => {
    lightHaptic();
    setFilter(DEFAULTS.filter); setGender(DEFAULTS.gender); setLanguage(DEFAULTS.language);
    setPrice(DEFAULTS.price); setFreeOnly(DEFAULTS.freeOnly); setSort(DEFAULTS.sort);
  }, []);

  // Active filter chips — one per applied filter, each with its own remove action.
  const activeChips = useMemo(() => {
    const arr: { key: string; label: string; onRemove: () => void }[] = [];
    if (gender !== 'all') {
      arr.push({ key: 'gender', label: gender === 'female' ? 'Female' : 'Male', onRemove: () => setGender('all') });
    }
    if (language !== 'All') {
      arr.push({ key: 'lang', label: language, onRemove: () => setLanguage('All') });
    }
    if (price[0] > PRICE_MIN || price[1] < PRICE_MAX) {
      const hi = price[1] >= PRICE_MAX ? '50+' : `$${price[1]}`;
      arr.push({ key: 'price', label: `$${price[0]}–${hi}`, onRemove: () => setPrice(DEFAULTS.price) });
    }
    if (freeOnly) {
      arr.push({ key: 'free', label: 'First 3-min free', onRemove: () => setFreeOnly(false) });
    }
    if (sort !== 'rating') {
      const s = SORTS.find((x) => x.key === sort);
      arr.push({ key: 'sort', label: s ? `Sort: ${s.label}` : 'Sort', onRemove: () => setSort('rating') });
    }
    return arr;
  }, [gender, language, price, freeOnly, sort]);

  const snapPoints = useMemo(() => ['85%'], []);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} pressBehavior="close" />,
    []
  );
  const openSheet = useCallback(() => {
    lightHaptic();
    bottomSheetRef.current?.present();
  }, []);
  const closeSheet = useCallback(() => bottomSheetRef.current?.dismiss(), []);

  const currentSortLabel = SORTS.find((s) => s.key === sort)?.label || 'Top rated';

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Astrologers</Text>
          <Text style={styles.subtitle}>Verified experts, available now</Text>
        </View>

        {/* Specialty chip row */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                testID={`filter-${f}`}
                onPress={() => { lightHaptic(); setFilter(f); }}
                style={[styles.chip, filter === f && styles.chipActive]}
              >
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Compact control bar */}
        <View style={styles.controlBar}>
          <Pressable testID="expand-filters" style={[styles.ctrlBtn, activeExtra > 0 && styles.ctrlBtnActive]} onPress={openSheet}>
            <Ionicons name="options-outline" size={15} color={activeExtra > 0 ? t.color.brand : t.color.onSurface} />
            <Text style={[styles.ctrlBtnText, activeExtra > 0 && styles.ctrlBtnTextAccent]}>Filters</Text>
            {activeExtra > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{activeExtra}</Text></View>
            )}
          </Pressable>

          <Pressable testID="sort-quick-pill" style={[styles.ctrlBtn, sort !== 'rating' && styles.ctrlBtnActive]} onPress={openSheet}>
            <Ionicons name="swap-vertical" size={14} color={sort !== 'rating' ? t.color.brand : t.color.onSurface} />
            <Text style={[styles.ctrlBtnText, sort !== 'rating' && styles.ctrlBtnTextAccent]} numberOfLines={1}>
              {currentSortLabel}
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Text style={styles.resultsInline} testID="results-count">
            {astros.length} result{astros.length === 1 ? '' : 's'}
          </Text>

          {anyFilterActive && (
            <Pressable testID="clear-filters" onPress={resetAll} hitSlop={8} style={styles.clearIconBtn} accessibilityLabel="Clear all filters">
              <Ionicons name="close-circle" size={20} color={t.color.brand} />
            </Pressable>
          )}
        </View>

        {/* Active filter chips — individually removable */}
        {activeChips.length > 0 && (
          <View style={styles.activeChipsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsContent}>
              {activeChips.map((c) => (
                <Pressable
                  key={c.key}
                  testID={`active-chip-${c.key}`}
                  onPress={() => { lightHaptic(); c.onRemove(); }}
                  style={styles.activeChip}
                >
                  <Text style={styles.activeChipText} numberOfLines={1}>{c.label}</Text>
                  <Ionicons name="close" size={12} color={t.color.brand} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* (inline panel removed — filter sheet lives at end of render tree) */}

        {loading ? (
          <ActivityIndicator color={t.color.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={astros}
            keyExtractor={(i) => i.astrologer_id}
            contentContainerStyle={{ padding: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: 140, gap: t.spacing.md }}
            ListEmptyComponent={
              <View style={styles.emptyWrap} testID="empty-state">
                <Ionicons name="search-outline" size={40} color={t.color.onSurfaceTertiary} />
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySub}>Try adjusting your filters.</Text>
                <Pressable testID="empty-reset" style={styles.emptyBtn} onPress={resetAll}>
                  <Text style={styles.emptyBtnText}>Reset filters</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                testID={`astro-card-${item.astrologer_id}`}
                style={styles.card}
                onPress={() => router.push(`/astrologer/${item.astrologer_id}` as any)}
              >
                <View>
                  <Image source={item.avatar} style={styles.avatar} contentFit="cover" />
                  {item.is_online && <View style={styles.dot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.gender && (
                      <Ionicons
                        name={item.gender === 'female' ? 'female' : 'male'}
                        size={12}
                        color={t.color.onSurfaceTertiary}
                      />
                    )}
                    {item.first_consult_free && (
                      <View style={styles.cardFreeChip}>
                        <Ionicons name="gift" size={10} color={t.color.brand} />
                        <Text style={styles.cardFreeText}>Free 3m</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.specs} numberOfLines={1}>{item.specialties.join(' · ')}</Text>
                  <Text style={styles.langs} numberOfLines={1}>{item.languages.join(', ')} · {item.experience_years}y exp</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={12} color={t.color.brand} />
                    <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
                    <Text style={styles.orders}>({item.reviews_count.toLocaleString()})</Text>
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <Text style={styles.price}>${item.price_per_min}</Text>
                  <Text style={styles.perMin}>/min</Text>
                  <View style={styles.chatBtn}>
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>

      {/* Filter bottom sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: t.color.borderStrong, width: 40 }}
        backgroundStyle={{ backgroundColor: t.color.surfaceSecondary }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters &amp; sort</Text>
            <Pressable testID="sheet-close" onPress={closeSheet} hitSlop={10}>
              <Ionicons name="close" size={22} color={t.color.onSurface} />
            </Pressable>
          </View>

          {/* Sort */}
          <Text style={styles.panelLabel}>Sort by</Text>
          <View style={styles.sortGrid}>
            {SORTS.map((s) => {
              const active = sort === s.key;
              return (
                <Pressable
                  key={s.key}
                  testID={`sort-${s.key}`}
                  onPress={() => { lightHaptic(); setSort(s.key as SortKey); }}
                  style={[styles.sortCard, active && styles.segmentPillActive]}
                >
                  <Ionicons name={s.icon} size={16} color={active ? t.color.onBrandPrimary : t.color.brand} />
                  <Text style={[styles.segmentText, active && { color: t.color.onBrandPrimary }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Gender */}
          <Text style={styles.panelLabel}>Gender</Text>
          <View style={styles.segmentRow} testID="gender-filter">
            {GENDERS.map((g) => {
              const active = gender === g.key;
              return (
                <Pressable
                  key={g.key}
                  testID={`gender-${g.key}`}
                  onPress={() => { lightHaptic(); setGender(g.key as Gender); }}
                  style={[styles.segmentPill, active && styles.segmentPillActive]}
                >
                  <Ionicons name={g.icon} size={13} color={active ? t.color.onBrandPrimary : t.color.onSurfaceSecondary} />
                  <Text style={[styles.segmentText, active && { color: t.color.onBrandPrimary }]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Language */}
          <Text style={styles.panelLabel}>Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langRow}>
            {LANGUAGES.map((l) => {
              const active = language === l;
              return (
                <Pressable
                  key={l}
                  testID={`lang-${l}`}
                  onPress={() => { lightHaptic(); setLanguage(l); }}
                  style={[styles.langChip, active && styles.langChipActive]}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>{l}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Price range (dual-thumb) */}
          <View style={styles.priceHeader}>
            <Text style={styles.panelLabel}>Price range</Text>
            <Text style={styles.priceValue} testID="price-value">
              ${price[0]} – {price[1] >= PRICE_MAX ? '$50+' : `$${price[1]}`}/min
            </Text>
          </View>
          <View style={styles.sliderWrap}>
            <MultiSlider
              values={price}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1}
              sliderLength={310}
              onValuesChange={(v) => setPrice([v[0], v[1]] as [number, number])}
              onValuesChangeFinish={() => lightHaptic()}
              selectedStyle={{ backgroundColor: t.color.brand, height: 4 }}
              unselectedStyle={{ backgroundColor: t.color.borderStrong, height: 4 }}
              markerStyle={{ height: 22, width: 22, backgroundColor: t.color.brand, borderWidth: 2, borderColor: t.color.surface }}
              pressedMarkerStyle={{ height: 26, width: 26 }}
              allowOverlap={false}
              minMarkerOverlapDistance={5}
              testID="price-slider"
            />
          </View>
          <View style={styles.priceLabels}>
            <Text style={styles.priceLabelText}>$5</Text>
            <Text style={styles.priceLabelText}>$50+</Text>
          </View>

          {/* Free first consult */}
          <Pressable
            testID="free-only-toggle"
            style={[styles.freeToggle, freeOnly && styles.freeToggleActive]}
            onPress={() => { lightHaptic(); setFreeOnly((v) => !v); }}
          >
            <View style={[styles.freeCheckbox, freeOnly && styles.freeCheckboxActive]}>
              {freeOnly && <Ionicons name="checkmark" size={14} color={t.color.onBrandPrimary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeTitle}>Free first 3 minutes</Text>
              <Text style={styles.freeSub}>Show astrologers offering a free intro consult for new users</Text>
            </View>
            <View style={styles.freeBadge}>
              <Ionicons name="gift" size={12} color={t.color.brand} />
              <Text style={styles.freeBadgeText}>NEW</Text>
            </View>
          </Pressable>

          <Pressable testID="sheet-apply" style={styles.applyBtn} onPress={closeSheet}>
            <Text style={styles.applyText}>Show {astros.length} result{astros.length === 1 ? '' : 's'}</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.surface },
    headerWrap: { paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: t.spacing.md },
    title: { color: t.color.onSurface, fontSize: 30, fontFamily: t.font.display },
    subtitle: { color: t.color.onSurfaceTertiary, marginTop: 4 },
    filterRow: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.color.border, justifyContent: 'center' },
    filterContent: { gap: t.spacing.sm, paddingHorizontal: t.spacing.xl, alignItems: 'center' },
    chip: {
      height: 36, paddingHorizontal: 16, borderRadius: t.radius.pill,
      borderWidth: 1, borderColor: t.color.borderStrong,
      backgroundColor: t.color.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    chipActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
    chipText: { color: t.color.onSurfaceSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: t.color.onBrandPrimary },
    controlBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: t.spacing.xl, paddingVertical: 10,
    },
    ctrlBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, height: 34, borderRadius: t.radius.pill,
      borderWidth: 1, borderColor: t.color.borderStrong,
      backgroundColor: t.color.surface,
      maxWidth: 160,
    },
    ctrlBtnActive: {
      borderColor: t.color.brand,
      backgroundColor: t.color.brandTertiary,
    },
    ctrlBtnText: { color: t.color.onSurface, fontSize: 13, fontWeight: '700' },
    ctrlBtnTextAccent: { color: t.color.brand },
    badge: {
      minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
      backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: t.color.onBrandPrimary, fontSize: 10, fontWeight: '800' },
    resultsInline: { color: t.color.onSurfaceTertiary, fontSize: 12, fontWeight: '600' },
    clearIconBtn: { padding: 2 },

    activeChipsBar: {
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.color.border,
    },
    activeChipsContent: {
      paddingHorizontal: t.spacing.xl,
      gap: 6,
      flexDirection: 'row', alignItems: 'center',
    },
    activeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingLeft: 10, paddingRight: 8, height: 28,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.brandTertiary,
      borderWidth: StyleSheet.hairlineWidth, borderColor: t.color.brandSecondary,
    },
    activeChipText: { color: t.color.brand, fontSize: 12, fontWeight: '700', maxWidth: 130 },
    panel: {
      paddingHorizontal: t.spacing.xl, paddingVertical: t.spacing.md, gap: t.spacing.sm,
      backgroundColor: t.color.surfaceSecondary,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.color.border,
    },
    panelLabel: {
      color: t.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.2,
      fontWeight: '700', textTransform: 'uppercase', marginTop: 6,
    },
    segmentRow: { flexDirection: 'row', gap: 6 },
    segmentPill: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: t.radius.pill,
      backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.border,
    },
    segmentPillActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
    segmentText: { color: t.color.onSurfaceSecondary, fontSize: 12, fontWeight: '700' },
    langRow: { gap: 6, paddingRight: 8 },
    langChip: {
      height: 32, paddingHorizontal: 14, borderRadius: t.radius.pill,
      borderWidth: 1, borderColor: t.color.border,
      backgroundColor: t.color.surface,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    langChipActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
    langText: { color: t.color.onSurfaceSecondary, fontSize: 12, fontWeight: '600' },
    langTextActive: { color: t.color.onBrandPrimary },
    priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    priceValue: { color: t.color.brand, fontSize: 14, fontWeight: '800' },
    sliderWrap: { alignItems: 'center', height: 36, justifyContent: 'center' },
    priceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
    priceLabelText: { color: t.color.onSurfaceTertiary, fontSize: 10 },
    freeToggle: {
      marginTop: 10,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: 1, borderColor: t.color.border,
    },
    freeToggleActive: { borderColor: t.color.brand, backgroundColor: t.color.brandTertiary },
    freeCheckbox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: t.color.borderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    freeCheckboxActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
    freeTitle: { color: t.color.onSurface, fontSize: 14, fontWeight: '700' },
    freeSub: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
    freeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill,
      backgroundColor: t.color.brandTertiary,
    },
    freeBadgeText: { color: t.color.brand, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    resultsCount: { color: t.color.onSurfaceTertiary, fontSize: 12, marginBottom: t.spacing.md, letterSpacing: 0.4 },
    card: {
      flexDirection: 'row', gap: t.spacing.md, alignItems: 'center',
      padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary,
      borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
    },
    avatar: { width: 64, height: 64, borderRadius: t.radius.md },
    dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: t.color.success, borderWidth: 2, borderColor: t.color.surfaceSecondary },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    name: { color: t.color.onSurface, fontWeight: '700', fontSize: 16, flexShrink: 1 },
    cardFreeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.pill,
      backgroundColor: t.color.brandTertiary,
    },
    cardFreeText: { color: t.color.brand, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
    specs: { color: t.color.brand, fontSize: 12, marginTop: 2 },
    langs: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    rating: { color: t.color.onSurface, fontSize: 12, fontWeight: '600' },
    orders: { color: t.color.onSurfaceTertiary, fontSize: 11 },
    rightCol: { alignItems: 'center', gap: 2 },
    price: { color: t.color.brand, fontSize: 18, fontWeight: '800' },
    perMin: { color: t.color.onSurfaceTertiary, fontSize: 10, marginTop: -4 },
    chatBtn: { marginTop: 6, backgroundColor: t.color.brand, paddingHorizontal: 14, paddingVertical: 6, borderRadius: t.radius.pill },
    chatBtnText: { color: t.color.onBrandPrimary, fontSize: 12, fontWeight: '700' },
    emptyWrap: { alignItems: 'center', paddingTop: 40, gap: t.spacing.sm },
    emptyTitle: { color: t.color.onSurface, fontSize: 18, fontWeight: '700', marginTop: t.spacing.md },
    emptySub: { color: t.color.onSurfaceTertiary, textAlign: 'center' },
    emptyBtn: { marginTop: t.spacing.md, backgroundColor: t.color.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: t.radius.pill },
    emptyBtnText: { color: t.color.onBrandPrimary, fontWeight: '700' },
    // Bottom-sheet
    sheetContent: { padding: t.spacing.xl, paddingBottom: 60, gap: t.spacing.sm },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.sm },
    sheetTitle: { color: t.color.onSurface, fontSize: 20, fontFamily: t.font.display },
    sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sortCard: {
      flexBasis: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: t.radius.md,
      backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.border,
    },
    applyBtn: {
      marginTop: t.spacing.lg, backgroundColor: t.color.brand,
      paddingVertical: 16, borderRadius: t.radius.pill, alignItems: 'center',
    },
    applyText: { color: t.color.onBrandPrimary, fontWeight: '800', fontSize: 15 },
  }), [t]);
}
