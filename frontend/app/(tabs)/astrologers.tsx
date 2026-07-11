import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

const FILTERS = ['All', 'Vedic', 'Tarot', 'Numerology', 'Palmistry', 'Face Reading', 'KP System'];
const GENDERS = [
  { key: 'all',    label: 'All',    icon: 'people' as const },
  { key: 'female', label: 'Female', icon: 'female' as const },
  { key: 'male',   label: 'Male',   icon: 'male' as const },
];

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function Astrologers() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [gender, setGender] = useState<'all' | 'female' | 'male'>('all');
  const [astros, setAstros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'All') params.set('specialty', filter);
    if (gender !== 'all') params.set('gender', gender);
    const qs = params.toString();
    api.get(`/api/astrologers${qs ? `?${qs}` : ''}`)
      .then(setAstros)
      .finally(() => setLoading(false));
  }, [filter, gender]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Astrologers</Text>
          <Text style={styles.subtitle}>Verified experts, available now</Text>
        </View>

        {/* Specialty filter chips */}
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

        {/* Gender segmented control */}
        <View style={styles.genderBar} testID="gender-filter">
          {GENDERS.map((g) => {
            const active = gender === g.key;
            return (
              <Pressable
                key={g.key}
                testID={`gender-${g.key}`}
                onPress={() => { lightHaptic(); setGender(g.key as any); }}
                style={[styles.genderPill, active && styles.genderPillActive]}
              >
                <Ionicons
                  name={g.icon}
                  size={14}
                  color={active ? t.color.onBrandPrimary : t.color.onSurfaceSecondary}
                />
                <Text style={[styles.genderText, active && { color: t.color.onBrandPrimary }]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </View>

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
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap} testID="empty-state">
                <Ionicons name="search-outline" size={40} color={t.color.onSurfaceTertiary} />
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySub}>Try a different specialty or gender.</Text>
                <Pressable
                  testID="empty-reset"
                  style={styles.emptyBtn}
                  onPress={() => { setFilter('All'); setGender('all'); }}
                >
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
      height: 36,
      paddingHorizontal: 16,
      borderRadius: t.radius.pill,
      borderWidth: 1, borderColor: t.color.borderStrong,
      backgroundColor: t.color.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    chipActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
    chipText: { color: t.color.onSurfaceSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: t.color.onBrandPrimary },
    genderBar: {
      flexDirection: 'row',
      gap: 6,
      marginHorizontal: t.spacing.xl,
      marginTop: t.spacing.md,
      padding: 4,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surfaceSecondary,
      borderWidth: 1, borderColor: t.color.border,
    },
    genderPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: t.radius.pill,
    },
    genderPillActive: { backgroundColor: t.color.brand },
    genderText: { color: t.color.onSurfaceSecondary, fontSize: 13, fontWeight: '700' },
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
