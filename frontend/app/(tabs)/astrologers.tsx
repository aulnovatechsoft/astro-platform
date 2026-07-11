import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, ActivityIndicator, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
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
  { key: 'rating',     label: 'Top rated', icon: 'star' as const },
  { key: 'experience', label: 'Experience', icon: 'ribbon' as const },
  { key: 'price_asc',  label: 'Price ↑',    icon: 'trending-up' as const },
];

const PRICE_MAX = 50;
const STORAGE_KEY = 'aura_astro_filters_v1';

type Gender = 'all' | 'female' | 'male';
type SortKey = 'rating' | 'experience' | 'price_asc';

type PersistedFilters = {
  filter: string;
  gender: Gender;
  language: string;
  maxPrice: number;
  sort: SortKey;
};

const DEFAULTS: PersistedFilters = {
  filter: 'All', gender: 'all', language: 'All', maxPrice: PRICE_MAX, sort: 'rating',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function Astrologers() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();

  const [filter, setFilter] = useState<string>(DEFAULTS.filter);
  const [gender, setGender] = useState<Gender>(DEFAULTS.gender);
  const [language, setLanguage] = useState<string>(DEFAULTS.language);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULTS.maxPrice);
  const [sort, setSort] = useState<SortKey>(DEFAULTS.sort);
  const [expanded, setExpanded] = useState(false);
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
          if (typeof p.maxPrice === 'number') setMaxPrice(p.maxPrice);
          if (p.sort) setSort(p.sort);
        } catch {}
      }
      setHydrated(true);
    })();
  }, []);

  // Save filters whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedFilters = { filter, gender, language, maxPrice, sort };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, filter, gender, language, maxPrice, sort]);

  // Fetch astrologers
  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'All') params.set('specialty', filter);
    if (gender !== 'all') params.set('gender', gender);
    if (language !== 'All') params.set('language', language);
    if (maxPrice < PRICE_MAX) params.set('max_price', String(maxPrice));
    if (sort !== 'rating') params.set('sort', sort);
    const qs = params.toString();
    api.get(`/api/astrologers${qs ? `?${qs}` : ''}`)
      .then(setAstros)
      .finally(() => setLoading(false));
  }, [hydrated, filter, gender, language, maxPrice, sort]);

  const activeExtra =
    (gender !== 'all' ? 1 : 0) +
    (language !== 'All' ? 1 : 0) +
    (maxPrice < PRICE_MAX ? 1 : 0) +
    (sort !== 'rating' ? 1 : 0);

  const resetAll = useCallback(() => {
    lightHaptic();
    setFilter(DEFAULTS.filter); setGender(DEFAULTS.gender); setLanguage(DEFAULTS.language);
    setMaxPrice(DEFAULTS.maxPrice); setSort(DEFAULTS.sort);
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Astrologers</Text>
          <Text style={styles.subtitle}>Verified experts, available now</Text>
        </View>

        {/* Specialty chip row */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
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

        {/* Extended filters toggle */}
        <Pressable
          testID="expand-filters"
          style={styles.expandBar}
          onPress={toggleExpand}
        >
          <Ionicons name="options-outline" size={16} color={t.color.brand} />
          <Text style={styles.expandText}>Filters &amp; sort</Text>
          {activeExtra > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{activeExtra}</Text></View>
          )}
          <View style={{ flex: 1 }} />
          {activeExtra > 0 && (
            <Pressable testID="clear-filters" onPress={resetAll} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={t.color.onSurfaceTertiary}
          />
        </Pressable>

        {expanded && (
          <View style={styles.panel} testID="filter-panel">
            {/* Sort */}
            <Text style={styles.panelLabel}>Sort by</Text>
            <View style={styles.segmentRow}>
              {SORTS.map((s) => {
                const active = sort === s.key;
                return (
                  <Pressable
                    key={s.key}
                    testID={`sort-${s.key}`}
                    onPress={() => { lightHaptic(); setSort(s.key as SortKey); }}
                    style={[styles.segmentPill, active && styles.segmentPillActive]}
                  >
                    <Ionicons name={s.icon} size={13} color={active ? t.color.onBrandPrimary : t.color.onSurfaceSecondary} />
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langRow}
            >
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

            {/* Price */}
            <View style={styles.priceHeader}>
              <Text style={styles.panelLabel}>Max price</Text>
              <Text style={styles.priceValue} testID="price-value">
                {maxPrice >= PRICE_MAX ? 'Any' : `$${Math.round(maxPrice)}/min`}
              </Text>
            </View>
            <Slider
              testID="price-slider"
              style={styles.slider}
              minimumValue={5}
              maximumValue={PRICE_MAX}
              step={1}
              value={maxPrice}
              onValueChange={setMaxPrice}
              onSlidingComplete={() => lightHaptic()}
              minimumTrackTintColor={t.color.brand}
              maximumTrackTintColor={t.color.borderStrong}
              thumbTintColor={t.color.brand}
            />
            <View style={styles.priceLabels}>
              <Text style={styles.priceLabelText}>$5</Text>
              <Text style={styles.priceLabelText}>${PRICE_MAX}+</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={t.color.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={astros}
            keyExtractor={(i) => i.astrologer_id}
            contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 140, gap: t.spacing.md }}
            ListHeaderComponent={
              <Text style={styles.resultsCount} testID="results-count">
                {astros.length} astrologer{astros.length === 1 ? '' : 's'}
                {filter !== 'All' ? ` · ${filter}` : ''}
                {gender !== 'all' ? ` · ${gender === 'female' ? 'Female' : 'Male'}` : ''}
                {language !== 'All' ? ` · ${language}` : ''}
                {maxPrice < PRICE_MAX ? ` · ≤ $${Math.round(maxPrice)}` : ''}
              </Text>
            }
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
    expandBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: t.spacing.xl, paddingVertical: t.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.color.border,
    },
    expandText: { color: t.color.onSurface, fontSize: 14, fontWeight: '700' },
    badge: {
      minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
      backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: t.color.onBrandPrimary, fontSize: 11, fontWeight: '800' },
    clearText: { color: t.color.brand, fontSize: 12, fontWeight: '700', marginRight: 6 },
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
    slider: { width: '100%', height: 32, marginTop: -6 },
    priceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
    priceLabelText: { color: t.color.onSurfaceTertiary, fontSize: 10 },
    resultsCount: { color: t.color.onSurfaceTertiary, fontSize: 12, marginBottom: t.spacing.md, letterSpacing: 0.4 },
    card: {
      flexDirection: 'row', gap: t.spacing.md, alignItems: 'center',
      padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary,
      borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
    },
    avatar: { width: 64, height: 64, borderRadius: t.radius.md },
    dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: t.color.success, borderWidth: 2, borderColor: t.color.surfaceSecondary },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: t.color.onSurface, fontWeight: '700', fontSize: 16, flexShrink: 1 },
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
  }), [t]);
}
