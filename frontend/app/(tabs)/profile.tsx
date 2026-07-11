import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/AuthContext';
import { useTheme, useThemeName, useSetTheme } from '@/src/ThemeContext';
import { THEME_META } from '@/src/theme';

export default function Profile() {
  const t = useTheme();
  const styles = useStyles();
  const themeName = useThemeName();
  const setThemeName = useSetTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const items = [
    { key: 'wallet', label: 'Wallet & Transactions', icon: 'wallet-outline', route: '/wallet' },
    { key: 'chats', label: 'My Consultations', icon: 'chatbubbles-outline', route: '/(tabs)/chats' },
    { key: 'kundli', label: 'Kundli & Horoscope', icon: 'moon-outline', route: '/(tabs)/kundli' },
    { key: 'remedies', label: 'Remedies & Store', icon: 'flower-outline', route: '/(tabs)/remedies' },
  ] as const;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 140 }}>
          {/* Identity card */}
          <View style={styles.card}>
            {user?.picture ? (
              <Image source={user.picture} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(user?.name || 'U')[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name} testID="profile-name">{user?.name}</Text>
            <Text style={styles.contact}>{user?.email || user?.phone}</Text>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet" size={14} color={t.color.brand} />
              <Text style={styles.walletText}>${(user?.wallet_balance ?? 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* Theme picker */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <Text style={styles.sectionSub}>Pick a look that fits your vibe</Text>
          </View>
          <View style={styles.themeGrid}>
            {THEME_META.map((m) => {
              const active = m.name === themeName;
              return (
                <Pressable
                  key={m.name}
                  testID={`theme-${m.name}`}
                  onPress={() => setThemeName(m.name)}
                  style={[styles.themeCard, active && styles.themeCardActive]}
                >
                  <View style={styles.swatchRow}>
                    {m.swatches.map((s, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: s }]} />
                    ))}
                  </View>
                  <View style={styles.themeMeta}>
                    <Text style={styles.themeLabel}>{m.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={16} color={t.color.brand} />}
                  </View>
                  <Text style={styles.themeTag} numberOfLines={1}>{m.tagline}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Menu */}
          <View style={{ marginTop: t.spacing.xl }}>
            {items.map((it) => (
              <Pressable
                key={it.key}
                testID={`profile-${it.key}`}
                style={styles.row}
                onPress={() => router.push(it.route as any)}
              >
                <Ionicons name={it.icon as any} size={20} color={t.color.brand} />
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={t.color.onSurfaceTertiary} />
              </Pressable>
            ))}

            {user?.is_admin && (
              <Pressable testID="profile-admin" style={[styles.row, styles.adminRow]} onPress={() => router.push('/admin')}>
                <Ionicons name="shield-checkmark" size={20} color={t.color.brand} />
                <Text style={[styles.rowLabel, { color: t.color.brand }]}>Admin Panel</Text>
                <Ionicons name="chevron-forward" size={18} color={t.color.brand} />
              </Pressable>
            )}

            <Pressable testID="profile-logout" style={[styles.row, { marginTop: t.spacing.lg }]} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={t.color.error} />
              <Text style={[styles.rowLabel, { color: t.color.error }]}>Sign out</Text>
              <View style={{ width: 18 }} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.surface },
    card: {
      alignItems: 'center', padding: t.spacing.xl, borderRadius: t.radius.lg,
      backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border,
      marginBottom: t.spacing.lg,
    },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarFallback: { backgroundColor: t.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: t.color.brand, fontSize: 36, fontFamily: t.font.display },
    name: { color: t.color.onSurface, fontSize: 22, fontFamily: t.font.display, marginTop: t.spacing.md },
    contact: { color: t.color.onSurfaceTertiary, marginTop: 4 },
    walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: t.spacing.md, backgroundColor: t.color.brandTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.pill },
    walletText: { color: t.color.brand, fontWeight: '700' },
    sectionHeader: { marginTop: t.spacing.md, marginBottom: t.spacing.md },
    sectionTitle: { color: t.color.onSurface, fontSize: 20, fontFamily: t.font.display },
    sectionSub: { color: t.color.onSurfaceTertiary, fontSize: 13, marginTop: 2 },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
    themeCard: {
      width: '48.5%',
      padding: t.spacing.md,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surfaceSecondary,
      borderWidth: 1.5, borderColor: t.color.border,
      gap: 8,
    },
    themeCardActive: { borderColor: t.color.brand, backgroundColor: t.color.brandTertiary },
    swatchRow: { flexDirection: 'row', gap: 4, height: 26, borderRadius: 6, overflow: 'hidden' },
    swatch: { flex: 1, borderRadius: 6 },
    themeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    themeLabel: { color: t.color.onSurface, fontWeight: '700', fontSize: 15 },
    themeTag: { color: t.color.onSurfaceTertiary, fontSize: 11 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: t.spacing.md,
      padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary,
      borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
      marginBottom: t.spacing.sm,
    },
    rowLabel: { flex: 1, color: t.color.onSurface, fontSize: 15, fontWeight: '600' },
    adminRow: { backgroundColor: t.color.brandTertiary, borderColor: t.color.brandSecondary },
  }), [t]);
}
