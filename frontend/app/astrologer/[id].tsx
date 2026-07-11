import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useTheme } from '@/src/ThemeContext';

export default function AstroDetail() {
  const t = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [astro, setAstro] = useState<any>(null);
  const [starting, setStarting] = useState<'chat' | 'call' | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      api.get(`/api/astrologers/${id}`).then(setAstro);
    }, [id])
  );

  const startChat = async () => {
    setStarting('chat');
    try {
      const resp = await api.post(`/api/chat/start/${id}`);
      await refresh();
      router.push(`/chat/${resp.chat_id}` as any);
    } catch (e: any) {
      Alert.alert('Cannot start chat', e.message);
    } finally { setStarting(null); }
  };

  const startCall = async () => {
    if (!astro) return;
    if ((user?.wallet_balance ?? 0) < astro.price_per_min) {
      Alert.alert('Insufficient balance', `You need at least $${astro.price_per_min} to start a call.`);
      return;
    }
    setStarting('call');
    router.push(`/call/${id}` as any);
    setStarting(null);
  };

  if (!astro) return <View style={styles.root}><ActivityIndicator color={t.color.brand} style={{ marginTop: 100 }} /></View>;

  return (
    <View style={styles.root}>
      <View style={styles.cover}>
        <Image source={astro.avatar} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(15,14,13,0)', 'rgba(15,14,13,0.85)', t.color.surface]} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.coverHeader}>
          <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={t.color.onSurface} />
          </Pressable>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="heart-outline" size={22} color={t.color.onSurface} />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.headerBlock}>
          <Text style={styles.name}>{astro.name}</Text>
          <Text style={styles.specs}>{astro.specialties.join(' · ')}</Text>
          <View style={styles.langRow}>
            {astro.languages.map((l: string) => (
              <View key={l} style={styles.langChip}><Text style={styles.langText}>{l}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{astro.experience_years}+</Text>
            <Text style={styles.metricLabel}>Years</Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{astro.orders.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Orders</Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.metric}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={16} color={t.color.brand} />
              <Text style={styles.metricValue}>{astro.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.metricLabel}>{astro.reviews_count.toLocaleString()} reviews</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{astro.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {(astro.reviews || []).length === 0 && <Text style={styles.emptyReview}>Be the first to leave a review after your session.</Text>}
          {(astro.reviews || []).map((r: any) => (
            <View key={r.review_id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {Array.from({ length: r.rating }).map((_, i) => (<Ionicons key={i} name="star" size={12} color={t.color.brand} />))}
                <Text style={styles.reviewName}>· {r.user_name}</Text>
              </View>
              <Text style={styles.reviewText}>{r.comment}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable
          testID="start-chat-cta"
          style={[styles.cta, styles.ctaPrimary]}
          onPress={startChat}
          disabled={!!starting}
        >
          {starting === 'chat' ? <ActivityIndicator color={t.color.onBrandPrimary} /> : (
            <>
              <Ionicons name="chatbubble" size={16} color={t.color.onBrandPrimary} />
              <Text style={styles.ctaText}>Chat · ${astro.price_per_min}/min</Text>
            </>
          )}
        </Pressable>
        <Pressable
          testID="start-call-cta"
          style={[styles.cta, styles.ctaSecondary]}
          onPress={startCall}
          disabled={!!starting}
        >
          <Ionicons name="call" size={16} color={t.color.brand} />
          <Text style={[styles.ctaText, { color: t.color.brand }]}>Call</Text>
        </Pressable>
      </View>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => (
    StyleSheet.create({
  root: { flex: 1, backgroundColor: t.color.surface },
  cover: { height: 380 },
  coverHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,14,13,0.6)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, marginTop: -100 },
  headerBlock: { paddingHorizontal: t.spacing.xl, paddingBottom: t.spacing.md },
  name: { color: t.color.onSurface, fontSize: 32, fontFamily: t.font.display },
  specs: { color: t.color.brand, marginTop: 4, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: 6, marginTop: t.spacing.sm, flexWrap: 'wrap' },
  langChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border },
  langText: { color: t.color.onSurfaceSecondary, fontSize: 11 },
  metrics: { flexDirection: 'row', marginHorizontal: t.spacing.xl, padding: t.spacing.lg, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: { color: t.color.onSurface, fontSize: 18, fontWeight: '700' },
  metricLabel: { color: t.color.onSurfaceTertiary, fontSize: 11 },
  dividerV: { width: 1, backgroundColor: t.color.border },
  section: { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, gap: t.spacing.sm },
  sectionTitle: { color: t.color.onSurface, fontSize: 18, fontFamily: t.font.display },
  bio: { color: t.color.onSurfaceSecondary, lineHeight: 22, fontSize: 14 },
  reviewCard: { padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border, gap: 6 },
  reviewName: { color: t.color.onSurfaceTertiary, fontSize: 12 },
  reviewText: { color: t.color.onSurfaceSecondary, fontSize: 13 },
  emptyReview: { color: t.color.onSurfaceTertiary, fontSize: 13, fontStyle: 'italic' },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: t.spacing.xl, backgroundColor: t.color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.color.border },
  cta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: t.radius.pill },
  ctaPrimary: { backgroundColor: t.color.brand, flex: 2 },
  ctaSecondary: { borderWidth: 1, borderColor: t.color.brand },
  ctaText: { color: t.color.onBrandPrimary, fontWeight: '700' },
})
  ), [t]);
}
