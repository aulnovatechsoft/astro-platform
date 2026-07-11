import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList, TextInput, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/AuthContext';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

const MOON_BG = 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85';

const ZODIAC = [
  { sign: 'Aries',       glyph: '♈', image: 'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=200&h=200&fit=crop&q=80' },
  { sign: 'Taurus',      glyph: '♉', image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=200&h=200&fit=crop&q=80' },
  { sign: 'Gemini',      glyph: '♊', image: 'https://images.unsplash.com/photo-1509515837298-2c67a3933321?w=200&h=200&fit=crop&q=80' },
  { sign: 'Cancer',      glyph: '♋', image: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=200&h=200&fit=crop&q=80' },
  { sign: 'Leo',         glyph: '♌', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=200&h=200&fit=crop&q=80' },
  { sign: 'Virgo',       glyph: '♍', image: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=200&h=200&fit=crop&q=80' },
  { sign: 'Libra',       glyph: '♎', image: 'https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=200&h=200&fit=crop&q=80' },
  { sign: 'Scorpio',     glyph: '♏', image: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=200&h=200&fit=crop&q=80' },
  { sign: 'Sagittarius', glyph: '♐', image: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=200&h=200&fit=crop&q=80' },
  { sign: 'Capricorn',   glyph: '♑', image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=200&h=200&fit=crop&q=80' },
  { sign: 'Aquarius',    glyph: '♒', image: 'https://images.unsplash.com/photo-1524055988636-436cfa46e59e?w=200&h=200&fit=crop&q=80' },
  { sign: 'Pisces',      glyph: '♓', image: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=200&h=200&fit=crop&q=80' },
];

const QUICK_ACTIONS = [
  { key: 'chat', label: 'Live Chat', sub: 'Instant', icon: 'chatbubbles', route: '/(tabs)/astrologers' },
  { key: 'call', label: 'Voice Call', sub: 'Talk now', icon: 'call', route: '/(tabs)/astrologers' },
  { key: 'kundli', label: 'Kundli', sub: 'Free chart', icon: 'moon', route: '/(tabs)/kundli' },
  { key: 'wallet', label: 'Wallet', sub: 'Top up', icon: 'wallet', route: '/wallet' },
];

function LivePulse() {
  const styles = useStyles();
  const [scale] = useState(new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale }] }]} />
      <View style={styles.pulseDot} />
    </View>
  );
}

export default function Home() {
  const t = useTheme();
  const styles = useStyles();
  const { user } = useAuth();
  const router = useRouter();
  const [sign, setSign] = useState('Leo');
  const [data, setData] = useState<any>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [compat, setCompat] = useState<any>(null);
  const [compatB, setCompatB] = useState('Aries');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (s: string) => {
    const d = await api.get(`/api/home-dashboard?sign=${s}`);
    setData(d);
  }, []);

  useEffect(() => { load(sign); }, [sign, load]);
  useEffect(() => {
    api.get(`/api/compatibility?sign1=${sign}&sign2=${compatB}`).then(setCompat).catch(() => {});
  }, [sign, compatB]);

  const onRefresh = async () => { setRefreshing(true); try { await load(sign); } finally { setRefreshing(false); } };

  const goAstros = (filter?: string) => {
    router.push('/(tabs)/astrologers');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.color.brand} />}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Namaste,</Text>
              <Text style={styles.name} testID="home-user-name">{user?.name?.split(' ')[0] || 'Seeker'} ✨</Text>
            </View>
            <Pressable testID="home-notifications" style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={t.color.onSurface} />
              {data?.announcement && <View style={styles.notifDot} />}
            </Pressable>
            <Pressable testID="home-wallet-pill" onPress={() => router.push('/wallet')} style={styles.walletPill}>
              <Ionicons name="wallet" size={14} color={t.color.brand} />
              <Text style={styles.walletText}>${(user?.wallet_balance ?? 0).toFixed(0)}</Text>
            </Pressable>
          </View>

          {/* SEARCH */}
          <Pressable style={styles.searchBar} onPress={() => goAstros()} testID="home-search">
            <Ionicons name="search" size={18} color={t.color.onSurfaceTertiary} />
            <Text style={styles.searchPlaceholder}>Ask about love, career, marriage…</Text>
          </Pressable>

          {/* ANNOUNCEMENT */}
          {data?.announcement && (
            <View style={styles.announceCard} testID="announcement-banner">
              <Ionicons name="megaphone" size={16} color={t.color.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.announceTitle}>{data.announcement.title}</Text>
                <Text style={styles.announceBody} numberOfLines={2}>{data.announcement.body}</Text>
              </View>
            </View>
          )}

          {/* ZODIAC SELECTOR — image-forward cards */}
          <Text style={styles.sectionEyebrow}>YOUR SIGN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zodiacRow}>
            {ZODIAC.map((z) => {
              const active = sign === z.sign;
              return (
                <Pressable
                  key={z.sign}
                  testID={`home-zodiac-${z.sign}`}
                  style={styles.signCard}
                  onPress={() => setSign(z.sign)}
                >
                  <View style={[styles.signImgWrap, active && { borderColor: t.color.brand }]}>
                    <Image source={z.image} style={styles.signImg} contentFit="cover" transition={200} />
                    <LinearGradient
                      colors={active ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)'] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                      style={StyleSheet.absoluteFill}
                    />
                    {active && <View style={styles.signActiveDot} />}
                  </View>
                  <Text style={[styles.signCardLabel, active && { color: t.color.brand }]}>{z.sign.slice(0, 3)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* HERO HOROSCOPE CARD */}
          <Pressable style={styles.hero} onPress={() => router.push('/(tabs)/kundli')} testID="home-hero-card">
            <Image source={MOON_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(15,14,13,0.2)', 'rgba(15,14,13,0.9)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>TODAY · {data?.horoscope?.dates}</Text>
              <Text style={styles.heroTitle}>{data?.horoscope?.sign}</Text>
              <Text style={styles.heroReading}>{data?.horoscope?.reading}</Text>
              <View style={styles.luckyRow}>
                <View style={styles.luckyChip}><Text style={styles.luckyKey}>Color</Text><Text style={styles.luckyVal}>{data?.horoscope?.lucky_color}</Text></View>
                <View style={styles.luckyChip}><Text style={styles.luckyKey}>Number</Text><Text style={styles.luckyVal}>{data?.horoscope?.lucky_number}</Text></View>
                <View style={styles.luckyChip}><Text style={styles.luckyKey}>Mood</Text><Text style={styles.luckyVal}>{data?.horoscope?.mood}</Text></View>
                <View style={styles.luckyChip}><Text style={styles.luckyKey}>Match</Text><Text style={styles.luckyVal}>{data?.horoscope?.compat}</Text></View>
              </View>
            </View>
          </Pressable>

          {/* QUICK ACTIONS */}
          <View style={styles.quickWrap}>
            {QUICK_ACTIONS.map((q) => (
              <Pressable
                key={q.key}
                testID={`quick-${q.key}`}
                style={styles.quickCard}
                onPress={() => router.push(q.route as any)}
              >
                <View style={styles.quickIcon}><Ionicons name={q.icon as any} size={20} color={t.color.brand} /></View>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickSub}>{q.sub}</Text>
              </Pressable>
            ))}
          </View>

          {/* PROMO */}
          <Pressable style={styles.promoBanner} onPress={() => router.push('/wallet')} testID="home-promo">
            <View style={styles.promoIconBox}><Ionicons name="gift" size={22} color={t.color.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>First recharge? Get +20% bonus</Text>
              <Text style={styles.promoSub}>Add $25 and get $30 wallet credit. Limited time.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.color.brand} />
          </Pressable>

          {/* LIVE NOW */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LivePulse />
              <Text style={styles.sectionTitle}>Live now</Text>
            </View>
            <Pressable onPress={() => goAstros()} testID="home-live-all"><Text style={styles.seeAll}>See all</Text></Pressable>
          </View>
          <FlatList
            data={data?.live_astrologers || []}
            horizontal
            keyExtractor={(i) => i.astrologer_id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: t.spacing.xl, gap: t.spacing.md }}
            renderItem={({ item }) => (
              <Pressable
                testID={`home-live-${item.astrologer_id}`}
                style={styles.liveCard}
                onPress={() => router.push(`/astrologer/${item.astrologer_id}` as any)}
              >
                <View style={styles.liveAvatarWrap}>
                  <Image source={item.avatar} style={styles.liveAvatar} contentFit="cover" />
                  <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
                </View>
                <Text style={styles.liveName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.liveSpec} numberOfLines={1}>{item.specialties[0]}</Text>
                <View style={styles.rateRow}>
                  <Ionicons name="star" size={11} color={t.color.brand} />
                  <Text style={styles.rateText}>{item.rating.toFixed(1)}</Text>
                  <Text style={styles.rateDot}>·</Text>
                  <Text style={styles.rateText}>${item.price_per_min}/min</Text>
                </View>
              </Pressable>
            )}
          />

          {/* CONCERNS — image-forward cards */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>Ask about</Text>
          <View style={styles.concernsGrid}>
            {(data?.concerns || []).map((c: any) => (
              <Pressable
                key={c.key}
                testID={`concern-${c.key}`}
                style={styles.concernCard}
                onPress={() => goAstros(c.specialty)}
              >
                <View style={styles.concernImgWrap}>
                  <Image source={c.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.concernLabelOverlay}>{c.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* PANCHANG — compact horizontal ribbon */}
          <View style={styles.panchangSectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today&apos;s Panchang</Text>
              <Text style={styles.panchangDate}>{new Date().toDateString()}</Text>
            </View>
            <View style={styles.auspiciousChip}><Ionicons name="sparkles" size={11} color={t.color.onBrandPrimary} /><Text style={styles.auspiciousText}>Shubh</Text></View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.panchangRow}
          >
            <View style={styles.panchangCell}><Text style={styles.pKey}>Tithi</Text><Text style={styles.pVal}>{data?.panchang?.tithi}</Text></View>
            <View style={styles.panchangCell}><Text style={styles.pKey}>Nakshatra</Text><Text style={styles.pVal}>{data?.panchang?.nakshatra}</Text></View>
            <View style={styles.panchangCell}><Text style={styles.pKey}>Sunrise</Text><Text style={styles.pVal}>{data?.panchang?.sunrise}</Text></View>
            <View style={styles.panchangCell}><Text style={styles.pKey}>Sunset</Text><Text style={styles.pVal}>{data?.panchang?.sunset}</Text></View>
            <View style={styles.panchangCell}><Text style={styles.pKey}>Abhijit</Text><Text style={[styles.pVal, { color: t.color.success }]}>{data?.panchang?.abhijit}</Text></View>
            <View style={styles.panchangCell}><Text style={styles.pKey}>Rahu Kaal</Text><Text style={[styles.pVal, { color: t.color.error }]}>{data?.panchang?.rahu_kaal}</Text></View>
          </ScrollView>

          {/* CARD OF THE DAY */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>Your Card of the Day</Text>
          <Pressable style={styles.tarotCard} onPress={() => setCardRevealed((r) => !r)} testID="card-of-the-day">
            {!cardRevealed ? (
              <LinearGradient colors={[t.color.brandTertiary, t.color.surfaceSecondary]} style={StyleSheet.absoluteFill}>
                <View style={styles.tarotBackContent}>
                  <Text style={styles.tarotBackGlyph}>✦</Text>
                  <Text style={styles.tarotBackText}>Tap to reveal</Text>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.tarotFront}>
                <Text style={styles.tarotName}>{data?.card_of_the_day?.name}</Text>
                <Text style={styles.tarotMeaning}>{data?.card_of_the_day?.meaning}</Text>
                <Text style={styles.tarotHint}>Tap to flip back</Text>
              </View>
            )}
          </Pressable>

          {/* COMPATIBILITY */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>Love Compatibility</Text>
          <View style={styles.compatCard}>
            <View style={styles.compatRow}>
              <View style={styles.compatPill}><Text style={styles.compatSignText}>{sign}</Text></View>
              <View style={styles.compatHeart}>
                <Ionicons name="heart" size={24} color={t.color.brand} />
                <Text style={styles.compatScore}>{compat?.score ?? '—'}%</Text>
              </View>
              <View style={styles.compatPill}><Text style={styles.compatSignText}>{compatB}</Text></View>
            </View>
            <Text style={styles.compatVerdict}>{compat?.verdict}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: t.spacing.md }}>
              {ZODIAC.map((z) => (
                <Pressable
                  key={z.sign}
                  testID={`compat-b-${z.sign}`}
                  onPress={() => setCompatB(z.sign)}
                  style={[styles.compatChip, compatB === z.sign && styles.compatChipActive]}
                >
                  <Text style={[styles.compatChipText, compatB === z.sign && { color: t.color.onBrandPrimary }]}>{z.glyph} {z.sign.slice(0,3)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* TOP ASTROLOGERS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top rated astrologers</Text>
            <Pressable onPress={() => goAstros()} testID="home-top-all"><Text style={styles.seeAll}>See all</Text></Pressable>
          </View>
          {(data?.top_astrologers || []).map((a: any) => (
            <Pressable
              key={a.astrologer_id}
              testID={`home-top-${a.astrologer_id}`}
              style={styles.topAstroRow}
              onPress={() => router.push(`/astrologer/${a.astrologer_id}` as any)}
            >
              <Image source={a.avatar} style={styles.topAvatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.topName}>{a.name}</Text>
                <Text style={styles.topSpec}>{a.specialties.join(' · ')}</Text>
                <View style={styles.rateRow}>
                  <Ionicons name="star" size={12} color={t.color.brand} />
                  <Text style={styles.rateText}>{a.rating.toFixed(1)}</Text>
                  <Text style={styles.rateDot}>·</Text>
                  <Text style={styles.rateText}>{a.experience_years}y exp</Text>
                </View>
              </View>
              <View style={styles.topPrice}>
                <Text style={styles.topPriceVal}>${a.price_per_min}</Text>
                <Text style={styles.topPriceMin}>/min</Text>
              </View>
            </Pressable>
          ))}

          {/* TESTIMONIALS */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>What seekers say</Text>
          <FlatList
            data={data?.testimonials || []}
            horizontal
            keyExtractor={(t) => t.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: t.spacing.xl, gap: t.spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.testCard} testID={`testimonial-${item.name}`}>
                <View style={styles.testStars}>
                  {Array.from({ length: item.rating }).map((_, i) => (<Ionicons key={i} name="star" size={12} color={t.color.brand} />))}
                </View>
                <Text style={styles.testText}>“{item.text}”</Text>
                <Text style={styles.testAuthor}>— {item.name}, {item.sign}</Text>
              </View>
            )}
          />

          {/* WISDOM QUOTE */}
          <View style={styles.wisdomCard}>
            <Text style={styles.wisdomQuote}>“{data?.wisdom}”</Text>
            <Text style={styles.wisdomHint}>— Cosmic wisdom for today</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => (
    StyleSheet.create({
  root: { flex: 1, backgroundColor: t.color.surface },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: t.spacing.md },
  hello: { color: t.color.onSurfaceTertiary, fontSize: 13 },
  name: { color: t.color.onSurface, fontSize: 22, fontFamily: t.font.display, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.color.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.color.border },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.brand },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: t.radius.pill, backgroundColor: t.color.brandTertiary },
  walletText: { color: t.color.brand, fontWeight: '800', fontSize: 13 },
  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: t.spacing.xl, paddingHorizontal: 14, paddingVertical: 12, borderRadius: t.radius.pill, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border },
  searchPlaceholder: { color: t.color.muted, fontSize: 14 },
  // Announcement
  announceCard: { flexDirection: 'row', gap: t.spacing.md, alignItems: 'flex-start', marginHorizontal: t.spacing.xl, marginTop: t.spacing.md, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderLeftWidth: 3, borderLeftColor: t.color.brand },
  announceTitle: { color: t.color.brand, fontWeight: '700', fontSize: 13 },
  announceBody: { color: t.color.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  // Sections
  sectionEyebrow: { color: t.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.3, fontWeight: '700', paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, marginBottom: t.spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md },
  sectionTitle: { color: t.color.onSurface, fontSize: 20, fontFamily: t.font.display },
  seeAll: { color: t.color.brand, fontSize: 13, fontWeight: '600' },
  // Zodiac selector — image cards
  zodiacRow: { paddingHorizontal: t.spacing.xl, gap: 10, alignItems: 'center', paddingBottom: t.spacing.md },
  signCard: { width: 68, alignItems: 'center', gap: 6, flexShrink: 0 },
  signCardActive: {},
  signImgWrap: {
    width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: t.color.surfaceSecondary,
  },
  signImg: { width: '100%', height: '100%' },
  signActiveDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: t.color.brand,
    borderWidth: 2, borderColor: t.color.surface,
  },
  signCardLabel: { color: t.color.onSurfaceSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  // Hero
  hero: { marginHorizontal: t.spacing.xl, height: 260, borderRadius: t.radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  heroContent: { padding: t.spacing.xl, gap: 6 },
  heroLabel: { color: t.color.brand, fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  heroTitle: { color: t.color.onSurface, fontSize: 32, fontFamily: t.font.display, lineHeight: 36 },
  heroReading: { color: t.color.onSurfaceSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  luckyRow: { flexDirection: 'row', gap: 6, marginTop: t.spacing.sm, flexWrap: 'wrap' },
  luckyChip: { backgroundColor: 'rgba(15,14,13,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(214,168,72,0.35)' },
  luckyKey: { color: t.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 0.6 },
  luckyVal: { color: t.color.brand, fontSize: 11, fontWeight: '700' },
  // Quick
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl, marginTop: t.spacing.lg },
  quickCard: { width: '47%', backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, padding: t.spacing.md, borderWidth: 1, borderColor: t.color.border },
  quickIcon: { width: 38, height: 38, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
  quickLabel: { color: t.color.onSurface, fontSize: 15, fontWeight: '700' },
  quickSub: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  // Promo
  promoBanner: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, marginHorizontal: t.spacing.xl, marginTop: t.spacing.lg, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary },
  promoIconBox: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: 'rgba(15,14,13,0.5)', alignItems: 'center', justifyContent: 'center' },
  promoTitle: { color: t.color.brand, fontWeight: '700', fontSize: 14 },
  promoSub: { color: t.color.onBrandTertiary, fontSize: 12, marginTop: 2 },
  // Live pulse
  pulseWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: t.color.success, opacity: 0.35 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.success },
  // Live cards
  liveCard: { width: 140, padding: t.spacing.sm, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border },
  liveAvatarWrap: { position: 'relative' },
  liveAvatar: { width: '100%', aspectRatio: 1, borderRadius: t.radius.md },
  liveBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: t.color.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  liveName: { color: t.color.onSurface, fontWeight: '700', marginTop: 8, fontSize: 13 },
  liveSpec: { color: t.color.brand, fontSize: 11, marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  rateText: { color: t.color.onSurface, fontSize: 11, fontWeight: '600' },
  rateDot: { color: t.color.onSurfaceTertiary, marginHorizontal: 2 },
  // Concerns — image-forward
  concernsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl },
  concernCard: { width: '30.5%', aspectRatio: 1, borderRadius: t.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: t.color.border },
  concernImgWrap: { flex: 1, justifyContent: 'flex-end' },
  concernLabelOverlay: { color: '#fff', fontSize: 13, fontWeight: '700', padding: 10, letterSpacing: 0.3 },
  // Panchang — compact ribbon
  panchangSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md,
  },
  panchangDate: { color: t.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  auspiciousChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.color.brand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: t.radius.pill },
  auspiciousText: { color: t.color.onBrandPrimary, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  panchangRow: { paddingHorizontal: t.spacing.xl, gap: 8 },
  panchangCell: {
    minWidth: 92,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.color.surfaceSecondary,
    borderWidth: 1, borderColor: t.color.border,
    flexShrink: 0,
  },
  pKey: { color: t.color.onSurfaceTertiary, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  pVal: { color: t.color.onSurface, fontSize: 13, fontWeight: '700', marginTop: 3 },
  // Tarot
  tarotCard: { marginHorizontal: t.spacing.xl, height: 200, borderRadius: t.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: t.color.brandSecondary, justifyContent: 'center', alignItems: 'center' },
  tarotBackContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  tarotBackGlyph: { color: t.color.brand, fontSize: 64 },
  tarotBackText: { color: t.color.onSurfaceSecondary, letterSpacing: 1.5, fontSize: 12, fontWeight: '700' },
  tarotFront: { padding: t.spacing.xl, alignItems: 'center', gap: t.spacing.sm },
  tarotName: { color: t.color.brand, fontSize: 26, fontFamily: t.font.display },
  tarotMeaning: { color: t.color.onSurfaceSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  tarotHint: { color: t.color.onSurfaceTertiary, fontSize: 10, marginTop: t.spacing.sm },
  // Compat
  compatCard: { marginHorizontal: t.spacing.xl, padding: t.spacing.lg, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border },
  compatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.md },
  compatPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary },
  compatSignText: { color: t.color.brand, fontWeight: '700' },
  compatHeart: { alignItems: 'center', gap: 4 },
  compatScore: { color: t.color.onSurface, fontSize: 20, fontFamily: t.font.display },
  compatVerdict: { color: t.color.onSurfaceSecondary, textAlign: 'center', fontSize: 13 },
  compatChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.pill, backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.borderStrong, flexShrink: 0 },
  compatChipActive: { backgroundColor: t.color.brand, borderColor: t.color.brand },
  compatChipText: { color: t.color.onSurfaceSecondary, fontSize: 12, fontWeight: '600' },
  // Top astro row
  topAstroRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, marginHorizontal: t.spacing.xl, marginBottom: t.spacing.sm, padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border },
  topAvatar: { width: 52, height: 52, borderRadius: 26 },
  topName: { color: t.color.onSurface, fontWeight: '700', fontSize: 15 },
  topSpec: { color: t.color.brand, fontSize: 11, marginTop: 2 },
  topPrice: { alignItems: 'center' },
  topPriceVal: { color: t.color.brand, fontSize: 18, fontWeight: '800' },
  topPriceMin: { color: t.color.onSurfaceTertiary, fontSize: 10, marginTop: -3 },
  // Testimonials
  testCard: { width: 260, padding: t.spacing.md, backgroundColor: t.color.surfaceSecondary, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border, gap: 8 },
  testStars: { flexDirection: 'row', gap: 2 },
  testText: { color: t.color.onSurface, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  testAuthor: { color: t.color.brand, fontSize: 11, fontWeight: '600' },
  // Wisdom
  wisdomCard: { marginHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, padding: t.spacing.xl, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary, alignItems: 'center', gap: t.spacing.sm },
  wisdomQuote: { color: t.color.brand, fontSize: 18, fontFamily: t.font.display, textAlign: 'center', lineHeight: 24 },
  wisdomHint: { color: t.color.onBrandTertiary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
})
  ), [t]);
}
