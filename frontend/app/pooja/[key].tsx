import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

export default function PoojaDetail() {
  const { key, type } = useLocalSearchParams<{ key: string; type?: string }>();
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);
  const isOffer = type === 'offer';

  useEffect(() => {
    if (!key) return;
    const endpoint = isOffer ? `/api/remedies/offer/${key}` : `/api/remedies/pooja/${key}`;
    api.get(endpoint).then(setItem).catch(() => setItem({ error: true }));
  }, [key, isOffer]);

  const book = async () => {
    if (!item || item.error) return;
    setBusy(true);
    try {
      const order = await api.post('/api/orders', {
        item_type: isOffer ? 'offer' : 'pooja',
        item_key: item.key ?? item.id,
        // label & price are now derived server-side from the catalog for integrity;
        // we still send them so the Pydantic model remains satisfied, but they are ignored.
        label: item.title ?? item.label,
        price_inr: item.price_inr,
        notes: notes.trim() || undefined,
      });
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
      setConfirmed(order);
    } catch {} finally { setBusy(false); }
  };

  if (!item) return <View style={styles.root}><ActivityIndicator color={t.color.brand} style={{ marginTop: 100 }} /></View>;
  if (item.error) return <View style={styles.root}><Text style={styles.err}>Item not found.</Text></View>;

  return (
    <View style={styles.root}>
      <View style={styles.cover}>
        <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(15,14,13,0.15)', 'rgba(15,14,13,0.85)', t.color.surface]} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.coverHeader}>
          <Pressable testID="pooja-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 200 }}>
        <View style={styles.headerBlock}>
          {item.tag && <View style={styles.tag}><Text style={styles.tagText}>{item.tag}</Text></View>}
          <Text style={styles.title}>{item.title ?? item.label}</Text>
          <Text style={styles.subtitle}>{item.subtitle ?? item.description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>₹{item.price_inr}</Text>
            {item.duration && <Text style={styles.duration}>· {item.duration}</Text>}
          </View>
        </View>

        {item.description && !item.subtitle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this ritual</Text>
            <Text style={styles.body}>{item.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What&apos;s included</Text>
          {['Live-guided ritual by a certified priest', 'Sankalpa taken in your name', 'Prasad photo/video within 24 hours', 'Follow-up guidance PDF'].map((line, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={t.color.brand} />
              <Text style={styles.bullet}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Any special intention?</Text>
          <TextInput
            testID="pooja-notes"
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Share your sankalpa or a specific wish (optional)"
            placeholderTextColor={t.color.muted}
            multiline
            maxLength={300}
          />
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaHint}>Total</Text>
          <Text style={styles.ctaPrice}>₹{item.price_inr}</Text>
        </View>
        <Pressable
          testID="pooja-book"
          style={[styles.bookBtn, busy && { opacity: 0.6 }]}
          onPress={book}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color={t.color.onBrandPrimary} /> : (
            <>
              <Ionicons name="sparkles" size={16} color={t.color.onBrandPrimary} />
              <Text style={styles.bookText}>Confirm Booking</Text>
            </>
          )}
        </Pressable>
      </View>

      {confirmed && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard} testID="pooja-confirmed">
            <View style={styles.confirmIcon}>
              <Ionicons name="checkmark" size={30} color={t.color.onBrandPrimary} />
            </View>
            <Text style={styles.confirmTitle}>Order confirmed</Text>
            <Text style={styles.confirmSub}>Order #{confirmed.order_id.slice(4)} · ₹{confirmed.price_inr}</Text>
            <Text style={styles.confirmBody}>Our team will reach out shortly to schedule and collect any details.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable style={styles.confirmSecondary} onPress={() => { setConfirmed(null); router.back(); }}>
                <Text style={styles.confirmSecondaryText}>Close</Text>
              </Pressable>
              <Pressable
                testID="view-orders-btn"
                style={styles.confirmPrimary}
                onPress={() => { setConfirmed(null); router.replace('/orders' as any); }}
              >
                <Text style={styles.confirmPrimaryText}>View orders</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.surface },
    cover: { height: 320 },
    coverHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: t.spacing.lg },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1, marginTop: -80 },
    headerBlock: { paddingHorizontal: t.spacing.xl, gap: 6 },
    tag: { alignSelf: 'flex-start', backgroundColor: t.color.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill, marginBottom: 6 },
    tagText: { color: t.color.onBrandPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
    title: { color: t.color.onSurface, fontSize: 28, fontFamily: t.font.display, lineHeight: 32 },
    subtitle: { color: t.color.onSurfaceSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
    price: { color: t.color.brand, fontSize: 24, fontWeight: '800' },
    duration: { color: t.color.onSurfaceTertiary, fontSize: 13 },
    section: { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, gap: t.spacing.sm },
    sectionTitle: { color: t.color.onSurface, fontSize: 16, fontWeight: '700' },
    body: { color: t.color.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
    bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    bullet: { color: t.color.onSurfaceSecondary, fontSize: 13, flex: 1 },
    input: { backgroundColor: t.color.surfaceSecondary, color: t.color.onSurface, borderRadius: t.radius.md, padding: t.spacing.md, minHeight: 88, textAlignVertical: 'top', borderWidth: 1, borderColor: t.color.border, fontSize: 14 },
    ctaBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: t.spacing.xl,
      backgroundColor: t.color.surface,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.color.border,
    },
    ctaHint: { color: t.color.onSurfaceTertiary, fontSize: 11 },
    ctaPrice: { color: t.color.onSurface, fontSize: 22, fontWeight: '800' },
    bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.color.brand, paddingVertical: 14, paddingHorizontal: 20, borderRadius: t.radius.pill },
    bookText: { color: t.color.onBrandPrimary, fontSize: 14, fontWeight: '800' },
    err: { color: t.color.error, textAlign: 'center', marginTop: 80 },
    confirmOverlay: { position: 'absolute', inset: 0 as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: t.spacing.xl },
    confirmCard: { backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.lg, padding: t.spacing.xl, alignItems: 'center', gap: 6, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: t.color.border },
    confirmIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    confirmTitle: { color: t.color.onSurface, fontSize: 22, fontFamily: t.font.display },
    confirmSub: { color: t.color.brand, fontSize: 13, fontWeight: '700' },
    confirmBody: { color: t.color.onSurfaceTertiary, fontSize: 13, textAlign: 'center', marginTop: 6 },
    confirmSecondary: { flex: 1, paddingVertical: 12, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.color.borderStrong, alignItems: 'center' },
    confirmSecondaryText: { color: t.color.onSurfaceSecondary, fontWeight: '700' },
    confirmPrimary: { flex: 1, paddingVertical: 12, borderRadius: t.radius.pill, backgroundColor: t.color.brand, alignItems: 'center' },
    confirmPrimaryText: { color: t.color.onBrandPrimary, fontWeight: '700' },
  }), [t]);
}
