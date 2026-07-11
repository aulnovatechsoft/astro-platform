import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

export default function Orders() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.get('/api/orders')); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable testID="orders-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={t.color.onSurface} />
          </Pressable>
          <Text style={styles.title}>My Orders</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.order_id}
          contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 140, gap: t.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.color.brand} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="orders-empty">
              <Ionicons name="receipt-outline" size={44} color={t.color.onSurfaceTertiary} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Book a pooja or remedy from the Remedies tab.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/remedies' as any)} testID="orders-empty-cta">
                <Text style={styles.emptyBtnText}>Explore remedies</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card} testID={`order-${item.order_id}`}>
              <View style={styles.statusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.orderLabel}>{item.label}</Text>
                <Text style={styles.orderMeta}>Order #{item.order_id.slice(4)} · {new Date(item.created_at).toLocaleDateString()}</Text>
                {item.notes ? <Text style={styles.orderNotes} numberOfLines={2}>&ldquo;{item.notes}&rdquo;</Text> : null}
                <View style={styles.statusPill}><Text style={styles.statusText}>{item.status.toUpperCase()}</Text></View>
              </View>
              <Text style={styles.price}>₹{item.price_inr}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.md },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.surfaceSecondary },
    title: { color: t.color.onSurface, fontSize: 18, fontWeight: '700' },
    card: { flexDirection: 'row', gap: 12, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border, alignItems: 'flex-start' },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.success, marginTop: 6 },
    orderLabel: { color: t.color.onSurface, fontWeight: '700', fontSize: 15 },
    orderMeta: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 3 },
    orderNotes: { color: t.color.onSurfaceSecondary, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
    statusPill: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: t.color.brandTertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill },
    statusText: { color: t.color.brand, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
    price: { color: t.color.brand, fontWeight: '800', fontSize: 16 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
    emptyTitle: { color: t.color.onSurface, fontSize: 18, fontWeight: '700', marginTop: t.spacing.md },
    emptySub: { color: t.color.onSurfaceTertiary, textAlign: 'center' },
    emptyBtn: { marginTop: t.spacing.lg, backgroundColor: t.color.brand, paddingHorizontal: 22, paddingVertical: 12, borderRadius: t.radius.pill },
    emptyBtnText: { color: t.color.onBrandPrimary, fontWeight: '700' },
  }), [t]);
}
