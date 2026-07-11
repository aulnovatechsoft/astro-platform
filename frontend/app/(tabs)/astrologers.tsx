import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const FILTERS = ['All', 'Vedic', 'Tarot', 'Numerology', 'Palmistry', 'KP System'];

export default function Astrologers() {
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
          <ActivityIndicator color={theme.color.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={astros}
            keyExtractor={(i) => i.astrologer_id}
            contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.md }}
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
                    <Ionicons name="star" size={12} color={theme.color.brand} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerWrap: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 30, fontFamily: theme.font.display },
  subtitle: { color: theme.color.onSurfaceTertiary, marginTop: 4 },
  filterRow: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border, justifyContent: 'center' },
  filterContent: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, alignItems: 'center' },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  chipText: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: theme.color.onBrandPrimary },
  card: {
    flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center',
    padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border,
  },
  avatar: { width: 64, height: 64, borderRadius: theme.radius.md },
  dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.color.success, borderWidth: 2, borderColor: theme.color.surfaceSecondary },
  name: { color: theme.color.onSurface, fontWeight: '700', fontSize: 16 },
  specs: { color: theme.color.brand, fontSize: 12, marginTop: 2 },
  langs: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { color: theme.color.onSurface, fontSize: 12, fontWeight: '600' },
  orders: { color: theme.color.onSurfaceTertiary, fontSize: 11 },
  rightCol: { alignItems: 'center', gap: 2 },
  price: { color: theme.color.brand, fontSize: 18, fontWeight: '800' },
  perMin: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: -4 },
  chatBtn: { marginTop: 6, backgroundColor: theme.color.brand, paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radius.pill },
  chatBtnText: { color: theme.color.onBrandPrimary, fontSize: 12, fontWeight: '700' },
  empty: { color: theme.color.onSurfaceTertiary, textAlign: 'center', marginTop: 40 },
});
