import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

export default function DoshDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const [dosh, setDosh] = useState<any>(null);

  useEffect(() => {
    if (!key) return;
    api.get(`/api/remedies/dosh/${key}`).then(setDosh).catch(() => setDosh({ error: true }));
  }, [key]);

  if (!dosh) return <View style={styles.root}><ActivityIndicator color={t.color.brand} style={{ marginTop: 100 }} /></View>;
  if (dosh.error) return <View style={styles.root}><Text style={styles.err}>Dosha not found.</Text></View>;

  return (
    <View style={styles.root}>
      <View style={styles.cover}>
        <Image source={dosh.image} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(15,14,13,0.2)', 'rgba(15,14,13,0.85)', t.color.surface]} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.coverHeader}>
          <Pressable testID="dosh-back" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerBlock}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="alert-circle" size={14} color={t.color.brand} />
            <Text style={styles.eyebrow}>DOSHA</Text>
          </View>
          <Text style={styles.title}>{dosh.label}</Text>
          <Text style={styles.summary}>{dosh.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mantras</Text>
          {dosh.mantras?.map((m: string, i: number) => (
            <View key={i} style={styles.mantraCard}>
              <Text style={styles.mantraIdx}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.mantraText}>{m}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rituals & remedies</Text>
          {dosh.rituals?.map((r: string, i: number) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="flower" size={16} color={t.color.brand} />
              <Text style={styles.body}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={styles.consultCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.consultLabel}>WHO TO CONSULT</Text>
            <Text style={styles.consultWho}>{dosh.who}</Text>
          </View>
          <Pressable
            testID="dosh-consult"
            style={styles.consultBtn}
            onPress={() => router.push({ pathname: '/(tabs)/astrologers', params: { specialty: dosh.consult_specialty } } as any)}
          >
            <Ionicons name="chatbubbles" size={14} color={t.color.onBrandPrimary} />
            <Text style={styles.consultBtnText}>Find expert</Text>
          </Pressable>
        </View>

        <Pressable
          testID="dosh-book-remedy"
          style={styles.remedyCta}
          onPress={() => router.push('/pooja/spells' as any)}
        >
          <Ionicons name="sparkles" size={16} color={t.color.onBrandPrimary} />
          <Text style={styles.remedyCtaText}>Book a remedial pooja</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.surface },
    cover: { height: 260 },
    coverHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: t.spacing.lg },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1, marginTop: -60 },
    headerBlock: { paddingHorizontal: t.spacing.xl, gap: 6 },
    eyebrowRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    eyebrow: { color: t.color.brand, fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
    title: { color: t.color.onSurface, fontSize: 30, fontFamily: t.font.display, lineHeight: 34 },
    summary: { color: t.color.onSurfaceSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 },
    section: { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, gap: t.spacing.sm },
    sectionTitle: { color: t.color.onSurface, fontSize: 16, fontWeight: '700' },
    mantraCard: { flexDirection: 'row', gap: 12, padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border, alignItems: 'center' },
    mantraIdx: { color: t.color.brand, fontFamily: t.font.display, fontSize: 22, width: 32 },
    mantraText: { flex: 1, color: t.color.onSurface, fontSize: 14, lineHeight: 20 },
    bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    body: { color: t.color.onSurfaceSecondary, fontSize: 14, flex: 1, lineHeight: 20 },
    consultCard: { marginHorizontal: t.spacing.xl, marginTop: t.spacing.xl, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary, flexDirection: 'row', alignItems: 'center', gap: 12 },
    consultLabel: { color: t.color.onBrandTertiary, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
    consultWho: { color: t.color.brand, fontWeight: '800', fontSize: 14, marginTop: 2 },
    consultBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.color.brand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: t.radius.pill },
    consultBtnText: { color: t.color.onBrandPrimary, fontWeight: '700', fontSize: 12 },
    remedyCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: t.spacing.xl, marginTop: t.spacing.md, paddingVertical: 14, borderRadius: t.radius.pill, backgroundColor: t.color.brand },
    remedyCtaText: { color: t.color.onBrandPrimary, fontWeight: '800' },
    err: { color: t.color.error, textAlign: 'center', marginTop: 80 },
  }), [t]);
}
