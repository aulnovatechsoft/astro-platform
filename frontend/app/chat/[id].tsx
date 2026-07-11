import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api, wsUrl } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { tokenStore } from '@/src/tokenStore';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [astro, setAstro] = useState<any>(null);
  const [typing, setTyping] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(user?.wallet_balance ?? 0);
  const [seconds, setSeconds] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { setWalletBalance(user?.wallet_balance ?? 0); }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const msgs = await api.get(`/api/chat/${id}/messages`);
      setMessages(msgs);
      // Fetch chat's astrologer via list
      const chats = await api.get('/api/chats');
      const c = chats.find((x: any) => x.chat_id === id);
      if (c) setAstro(c.astrologer);
      const token = await tokenStore.get();
      if (!token) return;
      const ws = new WebSocket(wsUrl(id as string, token));
      wsRef.current = ws;
      ws.onopen = () => setConnecting(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'message') {
            setTyping(false);
            setMessages((m) => [...m, data.message]);
            if (data.wallet_balance !== undefined) setWalletBalance(data.wallet_balance);
          } else if (data.type === 'typing') setTyping(true);
          else if (data.type === 'error') { /* handle later */ }
        } catch {}
      };
      ws.onclose = () => setConnecting(true);
      ws.onerror = () => setConnecting(true);
    })();
    return () => {
      wsRef.current?.close();
      refresh();
    };
  }, [id]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const send = () => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    if (astro && walletBalance < astro.price_per_min) return;
    setSending(true);
    wsRef.current.send(JSON.stringify({ text: text.trim() }));
    setText('');
    setTimeout(() => setSending(false), 400);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable testID="chat-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={theme.color.onSurface} /></Pressable>
          {astro && <Image source={astro.avatar} style={styles.headerAvatar} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{astro?.name || 'Astrologer'}</Text>
            <Text style={styles.headerMeta}>{connecting ? 'Connecting…' : `Live · ${mm}:${ss}`}</Text>
          </View>
          <View style={styles.balancePill}><Ionicons name="wallet" size={12} color={theme.color.brand} /><Text style={styles.balanceText}>${walletBalance.toFixed(2)}</Text></View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.message_id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}
          renderItem={({ item }) => (
            <View style={[styles.bubbleWrap, item.sender === 'user' ? styles.bubbleRight : styles.bubbleLeft]}>
              <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleAstro]}>
                <Text style={item.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextAstro}>{item.text}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={typing ? (
            <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
              <View style={[styles.bubble, styles.bubbleAstro, { flexDirection: 'row', gap: 6 }]}>
                <ActivityIndicator size="small" color={theme.color.brand} />
                <Text style={styles.bubbleTextAstro}>Typing…</Text>
              </View>
            </View>
          ) : null}
        />

        <View style={styles.composer}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={astro && walletBalance < astro.price_per_min ? `Top up to continue (needs $${astro.price_per_min})` : 'Type your message…'}
            placeholderTextColor={theme.color.muted}
            multiline
            editable={!astro || walletBalance >= astro.price_per_min}
          />
          <Pressable
            testID="chat-send"
            onPress={send}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color={theme.color.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerSafe: { backgroundColor: theme.color.surfaceSecondary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: theme.color.onSurface, fontWeight: '700' },
  headerMeta: { color: theme.color.brand, fontSize: 12 },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTertiary },
  balanceText: { color: theme.color.brand, fontSize: 12, fontWeight: '700' },
  bubbleWrap: { flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md },
  bubbleUser: { backgroundColor: theme.color.brand, borderBottomRightRadius: 4 },
  bubbleAstro: { backgroundColor: theme.color.brandTertiary, borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: theme.color.onBrandPrimary, fontSize: 15, lineHeight: 20 },
  bubbleTextAstro: { color: theme.color.onSurface, fontSize: 15, lineHeight: 20 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, padding: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.border, backgroundColor: theme.color.surfaceSecondary },
  input: { flex: 1, minHeight: 44, maxHeight: 120, color: theme.color.onSurface, backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.color.border, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
});
