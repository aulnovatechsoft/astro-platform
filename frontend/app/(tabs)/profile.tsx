import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useAuth } from '@/src/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const items = [
    { key: 'wallet', label: 'Wallet & Transactions', icon: 'wallet-outline', route: '/wallet' },
    { key: 'chats', label: 'My Consultations', icon: 'chatbubbles-outline', route: '/(tabs)/chats' },
    { key: 'kundli', label: 'My Kundli', icon: 'moon-outline', route: '/(tabs)/kundli' },
  ] as const;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140 }}>
          <View style={styles.card}>
            {user?.picture ? (
              <Image source={user.picture} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(user?.name || 'U')[0].toUpperCase()}</Text></View>
            )}
            <Text style={styles.name} testID="profile-name">{user?.name}</Text>
            <Text style={styles.contact}>{user?.email || user?.phone}</Text>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet" size={14} color={theme.color.brand} />
              <Text style={styles.walletText}>${(user?.wallet_balance ?? 0).toFixed(2)}</Text>
            </View>
          </View>

          {items.map((it) => (
            <Pressable
              key={it.key}
              testID={`profile-${it.key}`}
              style={styles.row}
              onPress={() => router.push(it.route as any)}
            >
              <Ionicons name={it.icon as any} size={20} color={theme.color.brand} />
              <Text style={styles.rowLabel}>{it.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          ))}

          {user?.is_admin && (
            <Pressable testID="profile-admin" style={[styles.row, styles.adminRow]} onPress={() => router.push('/admin')}>
              <Ionicons name="shield-checkmark" size={20} color={theme.color.brand} />
              <Text style={[styles.rowLabel, { color: theme.color.brand }]}>Admin Panel</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.color.brand} />
            </Pressable>
          )}

          <Pressable testID="profile-logout" style={[styles.row, { marginTop: theme.spacing.lg }]} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={theme.color.error} />
            <Text style={[styles.rowLabel, { color: theme.color.error }]}>Sign out</Text>
            <View style={{ width: 18 }} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  card: {
    alignItems: 'center', padding: theme.spacing.xl, borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
    marginBottom: theme.spacing.lg,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: theme.color.brand, fontSize: 36, fontFamily: theme.font.display },
  name: { color: theme.color.onSurface, fontSize: 22, fontFamily: theme.font.display, marginTop: theme.spacing.md },
  contact: { color: theme.color.onSurfaceTertiary, marginTop: 4 },
  walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.md, backgroundColor: theme.color.brandTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.pill },
  walletText: { color: theme.color.brand, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border,
    marginBottom: theme.spacing.sm,
  },
  rowLabel: { flex: 1, color: theme.color.onSurface, fontSize: 15, fontWeight: '600' },
  adminRow: { backgroundColor: theme.color.brandTertiary, borderColor: theme.color.brandSecondary },
});
