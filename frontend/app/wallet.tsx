import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useTheme } from '@/src/ThemeContext';

const AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function Wallet() {
  const t = useTheme();
  const styles = useStyles();
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
            <Ionicons name="chevron-back" size={22} color={t.color.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.color.brand} />}
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            {data ? (
              <Text style={styles.balanceAmount} testID="wallet-balance">${data.balance.toFixed(2)}</Text>
            ) : <ActivityIndicator color={t.color.brand} />}
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
                {busy === a ? <ActivityIndicator color={t.color.brand} /> : <Text style={styles.chipText}>+ ${a}</Text>}
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>Demo mode — daily & lifetime caps apply. Real payments (Razorpay) coming next.</Text>

          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.txnList}>
            {(data?.transactions || []).length === 0 && <Text style={styles.emptyTxn}>No transactions yet.</Text>}
            {(data?.transactions || []).map((t) => (
              <View key={t.txn_id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: t.amount > 0 ? 'rgba(62,102,73,0.25)' : 'rgba(158,62,62,0.25)' }]}>
                  <Ionicons name={t.amount > 0 ? 'arrow-down' : 'arrow-up'} size={16} color={t.amount > 0 ? t.color.success : t.color.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.description}</Text>
                  <Text style={styles.txnDate}>{new Date(t.created_at).toLocaleString()}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.amount > 0 ? t.color.success : t.color.onSurface }]}>{t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => (
    StyleSheet.create({
  root: { flex: 1, backgroundColor: t.color.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.surfaceSecondary },
  headerTitle: { color: t.color.onSurface, fontSize: 18, fontWeight: '700' },
  balanceCard: { marginHorizontal: t.spacing.xl, padding: t.spacing.xl, borderRadius: t.radius.lg, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary, alignItems: 'center', gap: t.spacing.sm },
  balanceLabel: { color: t.color.onBrandTertiary, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.2 },
  balanceAmount: { color: t.color.brand, fontSize: 48, fontFamily: t.font.display },
  balanceHint: { color: t.color.onBrandTertiary, fontSize: 12 },
  sectionTitle: { color: t.color.onSurface, fontSize: 18, fontFamily: t.font.display, paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl },
  chip: { width: '31%', paddingVertical: 14, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.borderStrong, alignItems: 'center' },
  chipText: { color: t.color.onSurface, fontSize: 16, fontWeight: '700' },
  note: { color: t.color.onSurfaceTertiary, fontSize: 12, textAlign: 'center', marginTop: t.spacing.md },
  txnList: { paddingHorizontal: t.spacing.xl, gap: t.spacing.sm },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border },
  txnIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txnDesc: { color: t.color.onSurface, fontSize: 14, fontWeight: '600' },
  txnDate: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  txnAmount: { fontWeight: '700', fontSize: 15 },
  emptyTxn: { color: t.color.onSurfaceTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: t.spacing.lg },
})
  ), [t]);
}
