import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

export default function Chats() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setChats(await api.get('/api/chats')); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Conversations</Text>
          <Text style={styles.subtitle}>Continue where you left off</Text>
        </View>
        <FlatList
          data={chats}
          keyExtractor={(i) => i.chat_id}
          contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 120, gap: t.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.color.brand} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={t.color.onSurfaceTertiary} />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySub}>Start a conversation with an astrologer.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/astrologers')} testID="empty-find-astro">
                <Text style={styles.emptyBtnText}>Find an astrologer</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-row-${item.chat_id}`}
              style={styles.row}
              onPress={() => router.push(`/chat/${item.chat_id}` as any)}
            >
              <Image source={item.astrologer?.avatar} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.astrologer?.name}</Text>
                <Text style={styles.last} numberOfLines={1}>{item.last_message}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.color.onSurfaceTertiary} />
            </Pressable>
          )}
        />
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.md,
    padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary,
    borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { color: t.color.onSurface, fontWeight: '700' },
  last: { color: t.color.onSurfaceTertiary, fontSize: 13, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: t.spacing.sm },
  emptyTitle: { color: t.color.onSurface, fontSize: 18, fontWeight: '700', marginTop: t.spacing.md },
  emptySub: { color: t.color.onSurfaceTertiary, textAlign: 'center' },
  emptyBtn: { marginTop: t.spacing.lg, backgroundColor: t.color.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: t.radius.pill },
  emptyBtnText: { color: t.color.onBrandPrimary, fontWeight: '700' },
})
  ), [t]);
}
