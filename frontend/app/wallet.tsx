import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function Wallet() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ balance: number; transactions: any[] } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setData(await api.get('/api/wallet'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addMoney = async (amount: number) => {
    setBusy(amount);
    try {
      await api.post('/api/wallet/add', { amount });
      await load(); await refresh();
    } catch {} finally { setBusy(null); }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable testID="wallet-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.color.brand} />}
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            {data ? (
              <Text style={styles.balanceAmount} testID="wallet-balance">${data.balance.toFixed(2)}</Text>
            ) : <ActivityIndicator color={theme.color.brand} />}
            <Text style={styles.balanceHint}>Use it for chats, calls, and premium readings.</Text>
          </View>

          <Text style={styles.sectionTitle}>Add money</Text>
          <View style={styles.grid}>
            {AMOUNTS.map((a) => (
              <Pressable
                key={a}
                testID={`add-money-${a}`}
                style={styles.chip}
                onPress={() => addMoney(a)}
                disabled={busy !== null}
              >
                {busy === a ? <ActivityIndicator color={theme.color.brand} /> : <Text style={styles.chipText}>+ ${a}</Text>}
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>Demo mode — real payments (Razorpay) coming soon.</Text>

          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.txnList}>
            {(data?.transactions || []).length === 0 && <Text style={styles.emptyTxn}>No transactions yet.</Text>}
            {(data?.transactions || []).map((t) => (
              <View key={t.txn_id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: t.amount > 0 ? 'rgba(62,102,73,0.25)' : 'rgba(158,62,62,0.25)' }]}>
                  <Ionicons name={t.amount > 0 ? 'arrow-down' : 'arrow-up'} size={16} color={t.amount > 0 ? theme.color.success : theme.color.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.description}</Text>
                  <Text style={styles.txnDate}>{new Date(t.created_at).toLocaleString()}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.amount > 0 ? theme.color.success : theme.color.onSurface }]}>{t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surfaceSecondary },
  headerTitle: { color: theme.color.onSurface, fontSize: 18, fontWeight: '700' },
  balanceCard: { marginHorizontal: theme.spacing.xl, padding: theme.spacing.xl, borderRadius: theme.radius.lg, backgroundColor: theme.color.brandTertiary, borderWidth: 1, borderColor: theme.color.brandSecondary, alignItems: 'center', gap: theme.spacing.sm },
  balanceLabel: { color: theme.color.onBrandTertiary, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.2 },
  balanceAmount: { color: theme.color.brand, fontSize: 48, fontFamily: theme.font.display },
  balanceHint: { color: theme.color.onBrandTertiary, fontSize: 12 },
  sectionTitle: { color: theme.color.onSurface, fontSize: 18, fontFamily: theme.font.display, paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  chip: { width: '31%', paddingVertical: 14, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderStrong, alignItems: 'center' },
  chipText: { color: theme.color.onSurface, fontSize: 16, fontWeight: '700' },
  note: { color: theme.color.onSurfaceTertiary, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.md },
  txnList: { paddingHorizontal: theme.spacing.xl, gap: theme.spacing.sm },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  txnIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txnDesc: { color: theme.color.onSurface, fontSize: 14, fontWeight: '600' },
  txnDate: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  txnAmount: { fontWeight: '700', fontSize: 15 },
  emptyTxn: { color: theme.color.onSurfaceTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: theme.spacing.lg },
});
