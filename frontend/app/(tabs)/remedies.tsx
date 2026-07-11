import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

// -------- Data ----------
const OFFERS = [
  {
    id: 'rudraksha',
    tag: 'FEATURED',
    title: 'Find your Perfect Rudraksha in a 1-on-1 session',
    subtitle: 'with our certified Rudraksha Expert',
    price: 'at just ₹199/-',
    cta: 'Book your Rudraksha Consultation now',
    image: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=800&q=80',
  },
  {
    id: 'gemstone',
    tag: 'NEW',
    title: 'Personalised Gemstone Report',
    subtitle: 'Discover the stones aligned with your birth chart',
    price: 'from ₹499/-',
    cta: 'Get your Gemstone report',
    image: 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=800&q=80',
  },
  {
    id: 'yagya',
    tag: 'LIVE YAGYA',
    title: 'Group Homa on Purnima',
    subtitle: 'Priests offer your sankalpa in a live yagya',
    price: 'sponsor from ₹351/-',
    cta: 'Reserve your seat',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
  },
];

const STATS = [
  { label: 'ORDERS',      value: '4,40,444' },
  { label: 'RATING',      value: '4.72★' },
  { label: 'EXPERTS',     value: '7,687' },
  { label: 'IN SESSION',  value: '7,617' },
];

const STORE = [
  { key: 'bracelets',   label: 'Bracelets',       image: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=300&q=80' },
  { key: 'rudraksha',   label: 'Rudraksha',       image: 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=300&q=80' },
  { key: 'gemstones',   label: 'All Gemstones',   image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&q=80' },
  { key: 'consult',     label: 'Gemstone Consult', image: 'https://images.unsplash.com/photo-1523875194681-bedd468c58bf?w=300&q=80' },
];

const POOJAS = [
  { key: 'pooja',     label: 'Pooja',              tag: 'TRENDING',          image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&q=80' },
  { key: 'spells',    label: 'Special Spells',     tag: 'STARTS AT ₹1100',   image: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&q=80' },
  { key: 'healing',   label: 'Special Healings',   tag: 'STARTS AT ₹1100',   image: 'https://images.unsplash.com/photo-1518314916381-77a37c2a49ae?w=600&q=80' },
  { key: 'palm',      label: 'Palmistry',          tag: 'STARTS AT ₹800',    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80' },
  { key: 'akashic',   label: 'Akashic Records',    tag: 'STARTS AT ₹499',    image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80' },
  { key: 'face',      label: 'Face Reading',       tag: 'STARTS AT ₹499',    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80' },
  { key: 'kundli',    label: 'Kundli Matching',    tag: 'STARTS AT ₹499',    image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80' },
  { key: 'btr',       label: 'Birth Time Rectification', tag: 'STARTS AT ₹499', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80' },
  { key: 'past',      label: 'Past Life Regression', tag: 'STARTS AT ₹1100', image: 'https://images.unsplash.com/photo-1479030160180-b1860951d696?w=600&q=80' },
  { key: 'name',      label: 'Name Correction',    tag: 'STARTS AT ₹499',    image: 'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=600&q=80' },
];

const TOP_SELLING = [
  { key: 'relationship', label: 'Relationship Healing',      image: 'https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=200&q=80' },
  { key: 'evil',         label: 'Evil Eye (Nazar Lagna)',    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&q=80' },
  { key: 'love',         label: 'Attract Your Love Spell',   image: 'https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=201&q=80' },
  { key: 'career',       label: 'Career Boost Pooja',        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200&q=80' },
  { key: 'angel',        label: 'Angel Healing (Seven)',     image: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=200&q=80' },
  { key: 'negativity',   label: 'Negativity Removal',        image: 'https://images.unsplash.com/photo-1518314916381-77a37c2a49ae?w=200&q=80' },
  { key: 'palm26',       label: 'Palmistry - 2026',          image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=201&q=80' },
];

const NEWLY_LAUNCHED = [
  { key: 'grahan', label: 'Grahan Dosh Shanti Pooja',  image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=200&q=80' },
  { key: 'guru',   label: 'Guru Chandal Dosh Nivaran', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=201&q=80' },
  { key: 'loan',   label: 'Loan (Karz) Mukti Pooja',   image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=200&q=80' },
  { key: 'pitra',  label: 'Pitra Dosh Shanti Pooja',   image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=201&q=80' },
  { key: 'vivah',  label: 'Vivah Badha Nivaran Pooja', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=201&q=80' },
  { key: 'saraswati', label: 'Mata Saraswati Pooja for Career', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=202&q=80' },
];

const DOSHAS = [
  { key: 'manglik', label: 'Manglik Dosh',     remedy: 'Kumbh Vivah + Hanuman Chalisa 108x' },
  { key: 'kaalsarp', label: 'Kaal Sarp Dosh',   remedy: 'Nag Panchami Pooja + Rudra Abhishek' },
  { key: 'shani',   label: 'Shani Sade Sati',  remedy: 'Shani Mantra + Blue Sapphire (with consult)' },
  { key: 'pitra',   label: 'Pitra Dosh',       remedy: 'Tarpan on Amavasya + Feeding crows' },
  { key: 'guru',    label: 'Guru Chandal Dosh', remedy: 'Guru Beej Mantra + Yellow Sapphire' },
  { key: 'nadi',    label: 'Nadi Dosh',        remedy: 'Mahamrityunjaya Homa + charity' },
];

export default function Remedies() {
  const t = useTheme();
  const styles = useStyles();
  const [offerIdx, setOfferIdx] = useState(0);
  const offerRef = useRef<FlatList>(null);

  // Auto-rotate offers every 5s
  useEffect(() => {
    const id = setInterval(() => {
      const next = (offerIdx + 1) % OFFERS.length;
      offerRef.current?.scrollToIndex({ index: next, animated: true });
      setOfferIdx(next);
    }, 5000);
    return () => clearInterval(id);
  }, [offerIdx]);

  const onOfferScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / (SCREEN_W - 32));
    if (i !== offerIdx) setOfferIdx(i);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>ASTRO</Text>
              <Text style={styles.brand}>Remedies</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.orderPill} testID="orders-btn">
                <Ionicons name="time-outline" size={14} color={t.color.brand} />
                <Text style={styles.orderText}>Orders</Text>
              </Pressable>
              <Pressable style={styles.iconBtn} testID="search-btn">
                <Ionicons name="search" size={18} color={t.color.onSurface} />
              </Pressable>
            </View>
          </View>

          {/* Offer carousel */}
          <FlatList
            ref={offerRef}
            data={OFFERS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onOfferScroll}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <View style={[styles.offerCard, { width: SCREEN_W - 32 }]} testID={`offer-${item.id}`}>
                <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)']}
                  locations={[0, 0.55, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.offerContent}>
                  <View style={styles.offerTag}><Text style={styles.offerTagText}>{item.tag}</Text></View>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  <Text style={styles.offerSub}>{item.subtitle}</Text>
                  <Text style={styles.offerPrice}>{item.price}</Text>
                  <Pressable style={styles.offerCta}>
                    <Ionicons name="arrow-forward" size={12} color={t.color.onBrandPrimary} />
                    <Text style={styles.offerCtaText}>{item.cta}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
          <View style={styles.dots}>
            {OFFERS.map((_, i) => (
              <View key={i} style={[styles.dot, i === offerIdx && styles.dotActive]} />
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsBar} testID="stats-bar">
            {STATS.map((s, i) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                {i < STATS.length - 1 && <View style={styles.statDivider} />}
              </View>
            ))}
          </View>

          {/* Store row */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aura Store</Text>
            <Pressable testID="visit-store"><Text style={styles.seeAll}>Visit Store</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRow}>
            {STORE.map((s) => (
              <Pressable key={s.key} testID={`store-${s.key}`} style={styles.storeCard}>
                <Image source={s.image} style={styles.storeImg} contentFit="cover" />
                <Text style={styles.storeLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Poojas grid */}
          <Text style={[styles.sectionTitle, { marginTop: t.spacing.xxl, paddingHorizontal: t.spacing.xl, marginBottom: t.spacing.md }]}>Poojas & rituals</Text>
          <View style={styles.poojaGrid}>
            {POOJAS.map((p) => (
              <Pressable key={p.key} testID={`pooja-${p.key}`} style={styles.poojaCard}>
                <Image source={p.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.poojaTag}><Text style={styles.poojaTagText}>{p.tag}</Text></View>
                <Text style={styles.poojaLabel}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Top Selling */}
          <View style={[styles.subSection, { backgroundColor: t.color.brandTertiary }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Selling</Text>
              <Pressable testID="top-selling-view-all"><Text style={styles.seeAll}>View All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleRow}>
              {TOP_SELLING.map((it) => (
                <Pressable key={it.key} testID={`top-${it.key}`} style={styles.circleCard}>
                  <Image source={it.image} style={styles.circleImg} contentFit="cover" />
                  <Text style={styles.circleLabel} numberOfLines={2}>{it.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Newly Launched */}
          <View style={[styles.subSection, { backgroundColor: t.color.brandTertiary }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Newly Launched</Text>
              <Pressable testID="new-view-all"><Text style={styles.seeAll}>View All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleRow}>
              {NEWLY_LAUNCHED.map((it) => (
                <Pressable key={it.key} testID={`new-${it.key}`} style={styles.circleCard}>
                  <Image source={it.image} style={styles.circleImg} contentFit="cover" />
                  <Text style={styles.circleLabel} numberOfLines={2}>{it.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Doshas & Remedies */}
          <Text style={[styles.sectionTitle, { marginTop: t.spacing.xxl, paddingHorizontal: t.spacing.xl, marginBottom: t.spacing.md }]}>Dosh & Remedies</Text>
          <View style={{ paddingHorizontal: t.spacing.xl, gap: t.spacing.sm }}>
            {DOSHAS.map((d) => (
              <Pressable key={d.key} testID={`dosh-${d.key}`} style={styles.doshCard}>
                <View style={styles.doshIcon}>
                  <Ionicons name="alert-circle" size={20} color={t.color.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doshTitle}>{d.label}</Text>
                  <Text style={styles.doshRemedy} numberOfLines={2}>{d.remedy}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.color.onSurfaceTertiary} />
              </Pressable>
            ))}
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
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.sm, paddingBottom: t.spacing.md,
    },
    eyebrow: { color: t.color.onSurfaceTertiary, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
    brand: { color: t.color.onSurface, fontSize: 28, fontFamily: t.font.display, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    orderPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.color.brand },
    orderText: { color: t.color.brand, fontSize: 12, fontWeight: '700' },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.color.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    offerCard: {
      height: 190, borderRadius: t.radius.lg, overflow: 'hidden',
      justifyContent: 'flex-end', marginRight: 12,
    },
    offerContent: { padding: t.spacing.lg, gap: 4 },
    offerTag: { alignSelf: 'flex-start', backgroundColor: t.color.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill, marginBottom: 4 },
    offerTagText: { color: t.color.onBrandPrimary, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    offerTitle: { color: '#fff', fontSize: 18, fontFamily: t.font.display, fontWeight: '700', lineHeight: 22 },
    offerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
    offerPrice: { color: t.color.brand, fontSize: 14, fontWeight: '800', marginTop: 4 },
    offerCta: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, backgroundColor: t.color.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill },
    offerCtaText: { color: t.color.onBrandPrimary, fontWeight: '700', fontSize: 12 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.color.borderStrong },
    dotActive: { width: 18, backgroundColor: t.color.brand },

    statsBar: {
      marginHorizontal: t.spacing.xl, marginTop: t.spacing.lg,
      flexDirection: 'row',
      paddingVertical: t.spacing.md,
      borderRadius: t.radius.md,
      backgroundColor: t.color.brandTertiary,
      borderWidth: 1, borderColor: t.color.brandSecondary,
    },
    statCell: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { color: t.color.brand, fontSize: 16, fontWeight: '800' },
    statLabel: { color: t.color.onBrandTertiary, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
    statDivider: { position: 'absolute', right: -0.5, top: 6, bottom: 6, width: 1, backgroundColor: t.color.brandSecondary },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md },
    sectionTitle: { color: t.color.onSurface, fontSize: 20, fontFamily: t.font.display },
    seeAll: { color: t.color.brand, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
    storeRow: { paddingHorizontal: t.spacing.xl, gap: 12 },
    storeCard: { width: 88, alignItems: 'center', gap: 6 },
    storeImg: { width: 88, height: 88, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border },
    storeLabel: { color: t.color.onSurface, fontSize: 11, fontWeight: '600', textAlign: 'center' },

    poojaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: t.spacing.xl },
    poojaCard: {
      width: (SCREEN_W - 48 - 12) / 2,
      aspectRatio: 0.95,
      borderRadius: t.radius.md, overflow: 'hidden',
      justifyContent: 'flex-end',
      borderWidth: 1, borderColor: t.color.border,
    },
    poojaTag: {
      position: 'absolute', top: 8, left: 0,
      backgroundColor: t.color.error,
      paddingHorizontal: 10, paddingVertical: 4,
      borderTopRightRadius: t.radius.pill, borderBottomRightRadius: t.radius.pill,
    },
    poojaTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    poojaLabel: { color: '#fff', fontSize: 16, fontWeight: '800', padding: 12, lineHeight: 20 },

    subSection: { marginTop: t.spacing.xl, paddingBottom: t.spacing.md, paddingTop: 4 },
    circleRow: { paddingHorizontal: t.spacing.xl, gap: 12, alignItems: 'flex-start' },
    circleCard: { width: 92, alignItems: 'center', gap: 8 },
    circleImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#fff' },
    circleLabel: { color: t.color.onBrandTertiary, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

    doshCard: {
      flexDirection: 'row', gap: t.spacing.md, alignItems: 'center',
      padding: t.spacing.md, borderRadius: t.radius.md,
      backgroundColor: t.color.surfaceSecondary,
      borderWidth: 1, borderColor: t.color.border,
    },
    doshIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
    doshTitle: { color: t.color.onSurface, fontSize: 14, fontWeight: '700' },
    doshRemedy: { color: t.color.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  }), [t]);
}
