import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

const FILTERS = ['All', 'Vedic', 'Tarot', 'Numerology', 'Palmistry', 'KP System'];

export default function Astrologers() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [astros, setAstros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/astrologers${filter !== 'All' ? `?specialty=${encodeURIComponent(filter)}` : ''}`)
      .then(setAstros)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Astrologers</Text>
          <Text style={styles.subtitle}>Verified experts, available now</Text>
        </View>

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
                onPress={() => setFilter(f)}
                style={[styles.chip, filter === f && styles.chipActive]}
              >
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator color={t.color.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={astros}
            keyExtractor={(i) => i.astrologer_id}
            contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 120, gap: t.spacing.md }}
            ListEmptyComponent={<Text style={styles.empty}>No astrologers match this filter.</Text>}
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
                  <Text style={styles.name}>{item.name}</Text>
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
  return useMemo(() => (
    StyleSheet.create({
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
  card: {
    flexDirection: 'row', gap: t.spacing.md, alignItems: 'center',
    padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary,
    borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
  },
  avatar: { width: 64, height: 64, borderRadius: t.radius.md },
  dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: t.color.success, borderWidth: 2, borderColor: t.color.surfaceSecondary },
  name: { color: t.color.onSurface, fontWeight: '700', fontSize: 16 },
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
  empty: { color: t.color.onSurfaceTertiary, textAlign: 'center', marginTop: 40 },
})
  ), [t]);
}
