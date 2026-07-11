import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { api, wsUrl } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { tokenStore } from '@/src/tokenStore';
import { useTheme } from '@/src/ThemeContext';

export default function ChatScreen() {
  const t = useTheme();
  const styles = useStyles();
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
  const [toast, setToast] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState('');
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
    setReviewError('');
    try {
      await api.post('/api/reviews', {
        astrologer_id: astro.astrologer_id,
        rating,
        comment: reviewText.trim() || 'Great session',
        chat_id: id,
      });
      setReviewSubmitted(true);
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
      setShowRating(false);
      setToast('Thank you for your review');
      wsRef.current?.close();
      setTimeout(() => {
        setToast(null);
        router.back();
      }, 1400);
    } catch (e: any) {
      const msg = e?.message || 'Could not submit review';
      setReviewError(msg);
      if (msg.toLowerCase().includes('already')) {
        setReviewSubmitted(true);
      }
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
          <Pressable testID="chat-back" onPress={openEndSession}><Ionicons name="chevron-back" size={22} color={t.color.onSurface} /></Pressable>
          {astro && <Image source={astro.avatar} style={styles.headerAvatar} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{astro?.name || 'Astrologer'}</Text>
            <Text style={styles.headerMeta}>{connecting ? 'Connecting…' : `Live · ${mm}:${ss}`}</Text>
          </View>
          <View style={styles.balancePill}><Ionicons name="wallet" size={12} color={t.color.brand} /><Text style={styles.balanceText}>${walletBalance.toFixed(2)}</Text></View>
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
          contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.sm, paddingBottom: t.spacing.md }}
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
                <ActivityIndicator size="small" color={t.color.brand} />
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
            placeholderTextColor={t.color.muted}
            multiline
            editable={!astro || walletBalance >= astro.price_per_min}
          />
          <Pressable
            testID="chat-send"
            onPress={send}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color={t.color.onBrandPrimary} />
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
                    color={n <= rating ? t.color.brand : t.color.borderStrong}
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
              placeholderTextColor={t.color.muted}
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
                  ? <ActivityIndicator color={t.color.onBrandPrimary} />
                  : <Text style={styles.submitText}>Submit review</Text>}
              </Pressable>
            </View>

            {!!reviewError && <Text style={styles.reviewErrorText} testID="review-error">{reviewError}</Text>}
          </View>
        </View>
      </Modal>

      {!!toast && (
        <Animated.View
          entering={FadeInUp.duration(220)}
          exiting={FadeOutDown.duration(220)}
          style={styles.toast}
          testID="review-toast"
          pointerEvents="none"
        >
          <View style={styles.toastIcon}>
            <Ionicons name="checkmark" size={16} color={t.color.onBrandPrimary} />
          </View>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => (
    StyleSheet.create({
  root: { flex: 1, backgroundColor: t.color.surface },
  headerSafe: { backgroundColor: t.color.surfaceSecondary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.color.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: t.color.onSurface, fontWeight: '700' },
  headerMeta: { color: t.color.brand, fontSize: 12 },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: t.radius.pill, backgroundColor: t.color.brandTertiary },
  balanceText: { color: t.color.brand, fontSize: 12, fontWeight: '700' },
  bubbleWrap: { flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: t.radius.md },
  bubbleUser: { backgroundColor: t.color.brand, borderBottomRightRadius: 4 },
  bubbleAstro: { backgroundColor: t.color.brandTertiary, borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: t.color.onBrandPrimary, fontSize: 15, lineHeight: 20 },
  bubbleTextAstro: { color: t.color.onSurface, fontSize: 15, lineHeight: 20 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm, padding: t.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.color.border, backgroundColor: t.color.surfaceSecondary },
  input: { flex: 1, minHeight: 44, maxHeight: 120, color: t.color.onSurface, backgroundColor: t.color.surface, borderRadius: t.radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: t.color.border, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center' },
  endPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill, backgroundColor: 'rgba(158,62,62,0.2)', borderWidth: 1, borderColor: t.color.error },
  endPillText: { color: t.color.error, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: t.spacing.xl },
  modalCard: { backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.lg, padding: t.spacing.xl, borderWidth: 1, borderColor: t.color.border, gap: t.spacing.md },
  modalHeader: { alignItems: 'center', gap: 6 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: t.color.brand, marginBottom: t.spacing.sm },
  modalTitle: { color: t.color.onSurface, fontSize: 22, fontFamily: t.font.display },
  modalSub: { color: t.color.onSurfaceTertiary, fontSize: 13, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: t.spacing.md, marginTop: t.spacing.sm },
  reviewInput: { backgroundColor: t.color.surface, color: t.color.onSurface, borderRadius: t.radius.md, padding: t.spacing.md, borderWidth: 1, borderColor: t.color.border, fontSize: 14, minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm },
  skipBtn: { flex: 1, paddingVertical: 14, borderRadius: t.radius.pill, alignItems: 'center', borderWidth: 1, borderColor: t.color.borderStrong },
  skipText: { color: t.color.onSurfaceSecondary, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: t.radius.pill, backgroundColor: t.color.brand, alignItems: 'center' },
  submitText: { color: t.color.onBrandPrimary, fontWeight: '700' },
  reviewErrorText: { color: t.color.error, fontSize: 12, textAlign: 'center', marginTop: -4 },
  toast: {
    position: 'absolute',
    left: 20, right: 20, bottom: 40,
    backgroundColor: t.color.surfaceSecondary,
    borderWidth: 1, borderColor: t.color.brand,
    borderRadius: t.radius.pill,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: t.color.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  toastText: { color: t.color.onSurface, fontSize: 14, fontWeight: '600', flex: 1 },
})
  ), [t]);
}
