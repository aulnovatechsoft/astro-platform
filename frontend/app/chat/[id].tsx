import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
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
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
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

  const openEndSession = () => {
    // Only prompt for rating if there is at least one user message
    const hasUserMsgs = messages.some((m) => m.sender === 'user');
    if (hasUserMsgs && !reviewSubmitted) {
      setShowRating(true);
    } else {
      wsRef.current?.close();
      router.back();
    }
  };

  const submitReview = async () => {
    if (rating < 1 || !astro) return;
    setSubmittingReview(true);
    try {
      await api.post('/api/reviews', {
        astrologer_id: astro.astrologer_id,
        rating,
        comment: reviewText.trim() || 'Great session',
      });
      setReviewSubmitted(true);
      setShowRating(false);
      wsRef.current?.close();
      setTimeout(() => router.back(), 200);
    } catch {
      // fail silently, keep modal open so they can retry
    } finally {
      setSubmittingReview(false);
    }
  };

  const skipReview = () => {
    setShowRating(false);
    wsRef.current?.close();
    router.back();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable testID="chat-back" onPress={openEndSession}><Ionicons name="chevron-back" size={22} color={theme.color.onSurface} /></Pressable>
          {astro && <Image source={astro.avatar} style={styles.headerAvatar} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{astro?.name || 'Astrologer'}</Text>
            <Text style={styles.headerMeta}>{connecting ? 'Connecting…' : `Live · ${mm}:${ss}`}</Text>
          </View>
          <View style={styles.balancePill}><Ionicons name="wallet" size={12} color={theme.color.brand} /><Text style={styles.balanceText}>${walletBalance.toFixed(2)}</Text></View>
          <Pressable testID="chat-end-btn" style={styles.endPill} onPress={openEndSession}>
            <Text style={styles.endPillText}>End</Text>
          </Pressable>
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

      <Modal
        visible={showRating}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRating(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="review-modal">
            <View style={styles.modalHeader}>
              {astro && <Image source={astro.avatar} style={styles.modalAvatar} contentFit="cover" />}
              <Text style={styles.modalTitle}>Rate your session</Text>
              <Text style={styles.modalSub}>How was your reading with {astro?.name}?</Text>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  testID={`star-${n}`}
                  onPress={() => setRating(n)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={n <= rating ? theme.color.brand : theme.color.borderStrong}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              testID="review-comment"
              style={styles.reviewInput}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Share a few words about your experience (optional)"
              placeholderTextColor={theme.color.muted}
              multiline
              maxLength={300}
            />

            <View style={styles.modalActions}>
              <Pressable testID="review-skip" style={styles.skipBtn} onPress={skipReview} disabled={submittingReview}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              <Pressable
                testID="review-submit"
                style={[styles.submitBtn, (rating < 1 || submittingReview) && { opacity: 0.5 }]}
                onPress={submitReview}
                disabled={rating < 1 || submittingReview}
              >
                {submittingReview
                  ? <ActivityIndicator color={theme.color.onBrandPrimary} />
                  : <Text style={styles.submitText}>Submit review</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  endPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: 'rgba(158,62,62,0.2)', borderWidth: 1, borderColor: theme.color.error },
  endPillText: { color: theme.color.error, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: theme.spacing.xl },
  modalCard: { backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.lg, padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.color.border, gap: theme.spacing.md },
  modalHeader: { alignItems: 'center', gap: 6 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.color.brand, marginBottom: theme.spacing.sm },
  modalTitle: { color: theme.color.onSurface, fontSize: 22, fontFamily: theme.font.display },
  modalSub: { color: theme.color.onSurfaceTertiary, fontSize: 13, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  reviewInput: { backgroundColor: theme.color.surface, color: theme.color.onSurface, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border, fontSize: 14, minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  skipBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', borderWidth: 1, borderColor: theme.color.borderStrong },
  skipText: { color: theme.color.onSurfaceSecondary, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: theme.radius.pill, backgroundColor: theme.color.brand, alignItems: 'center' },
  submitText: { color: theme.color.onBrandPrimary, fontWeight: '700' },
});
