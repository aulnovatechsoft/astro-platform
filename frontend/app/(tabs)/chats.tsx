import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function Chats() {
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
          contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.color.brand} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.color.onSurfaceTertiary} />
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
              <Ionicons name="chevron-forward" size={18} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerWrap: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 30, fontFamily: theme.font.display },
  subtitle: { color: theme.color.onSurfaceTertiary, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { color: theme.color.onSurface, fontWeight: '700' },
  last: { color: theme.color.onSurfaceTertiary, fontSize: 13, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: theme.spacing.sm },
  emptyTitle: { color: theme.color.onSurface, fontSize: 18, fontWeight: '700', marginTop: theme.spacing.md },
  emptySub: { color: theme.color.onSurfaceTertiary, textAlign: 'center' },
  emptyBtn: { marginTop: theme.spacing.lg, backgroundColor: theme.color.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: theme.radius.pill },
  emptyBtnText: { color: theme.color.onBrandPrimary, fontWeight: '700' },
});
