import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList, TextInput, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useAuth } from '@/src/AuthContext';
import { api } from '@/src/api';

const MOON_BG = 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85';

const ZODIAC = [
  { sign: 'Aries', glyph: '♈' }, { sign: 'Taurus', glyph: '♉' }, { sign: 'Gemini', glyph: '♊' },
  { sign: 'Cancer', glyph: '♋' }, { sign: 'Leo', glyph: '♌' }, { sign: 'Virgo', glyph: '♍' },
  { sign: 'Libra', glyph: '♎' }, { sign: 'Scorpio', glyph: '♏' }, { sign: 'Sagittarius', glyph: '♐' },
  { sign: 'Capricorn', glyph: '♑' }, { sign: 'Aquarius', glyph: '♒' }, { sign: 'Pisces', glyph: '♓' },
];

const QUICK_ACTIONS = [
  { key: 'chat', label: 'Live Chat', sub: 'Instant', icon: 'chatbubbles', route: '/(tabs)/astrologers' },
  { key: 'call', label: 'Voice Call', sub: 'Talk now', icon: 'call', route: '/(tabs)/astrologers' },
  { key: 'kundli', label: 'Kundli', sub: 'Free chart', icon: 'moon', route: '/(tabs)/kundli' },
  { key: 'wallet', label: 'Wallet', sub: 'Top up', icon: 'wallet', route: '/wallet' },
];

function LivePulse() {
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
          contentContainerStyle={{ paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.brand} />}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Namaste,</Text>
              <Text style={styles.name} testID="home-user-name">{user?.name?.split(' ')[0] || 'Seeker'} ✨</Text>
            </View>
            <Pressable testID="home-notifications" style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={theme.color.onSurface} />
              {data?.announcement && <View style={styles.notifDot} />}
            </Pressable>
            <Pressable testID="home-wallet-pill" onPress={() => router.push('/wallet')} style={styles.walletPill}>
              <Ionicons name="wallet" size={14} color={theme.color.brand} />
              <Text style={styles.walletText}>${(user?.wallet_balance ?? 0).toFixed(0)}</Text>
            </Pressable>
          </View>

          {/* SEARCH */}
          <Pressable style={styles.searchBar} onPress={() => goAstros()} testID="home-search">
            <Ionicons name="search" size={18} color={theme.color.onSurfaceTertiary} />
            <Text style={styles.searchPlaceholder}>Ask about love, career, marriage…</Text>
          </Pressable>

          {/* ANNOUNCEMENT */}
          {data?.announcement && (
            <View style={styles.announceCard} testID="announcement-banner">
              <Ionicons name="megaphone" size={16} color={theme.color.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.announceTitle}>{data.announcement.title}</Text>
                <Text style={styles.announceBody} numberOfLines={2}>{data.announcement.body}</Text>
              </View>
            </View>
          )}

          {/* ZODIAC SELECTOR */}
          <Text style={styles.sectionEyebrow}>YOUR SIGN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zodiacRow}>
            {ZODIAC.map((z) => (
              <Pressable
                key={z.sign}
                testID={`home-zodiac-${z.sign}`}
                style={[styles.signPill, sign === z.sign && styles.signPillActive]}
                onPress={() => setSign(z.sign)}
              >
                <Text style={[styles.signGlyph, sign === z.sign && { color: theme.color.onBrandPrimary }]}>{z.glyph}</Text>
                <Text style={[styles.signLabel, sign === z.sign && { color: theme.color.onBrandPrimary }]}>{z.sign.slice(0, 3)}</Text>
              </Pressable>
            ))}
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
                <View style={styles.quickIcon}><Ionicons name={q.icon as any} size={20} color={theme.color.brand} /></View>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickSub}>{q.sub}</Text>
              </Pressable>
            ))}
          </View>

          {/* PROMO */}
          <Pressable style={styles.promoBanner} onPress={() => router.push('/wallet')} testID="home-promo">
            <View style={styles.promoIconBox}><Ionicons name="gift" size={22} color={theme.color.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>First recharge? Get +20% bonus</Text>
              <Text style={styles.promoSub}>Add $25 and get $30 wallet credit. Limited time.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.color.brand} />
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
            contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}
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
                  <Ionicons name="star" size={11} color={theme.color.brand} />
                  <Text style={styles.rateText}>{item.rating.toFixed(1)}</Text>
                  <Text style={styles.rateDot}>·</Text>
                  <Text style={styles.rateText}>${item.price_per_min}/min</Text>
                </View>
              </Pressable>
            )}
          />

          {/* CONCERNS */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md }]}>Ask about</Text>
          <View style={styles.concernsGrid}>
            {(data?.concerns || []).map((c: any) => (
              <Pressable
                key={c.key}
                testID={`concern-${c.key}`}
                style={styles.concernCard}
                onPress={() => goAstros(c.specialty)}
              >
                <View style={styles.concernIcon}><Ionicons name={c.icon} size={18} color={theme.color.brand} /></View>
                <Text style={styles.concernLabel}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* PANCHANG */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md }]}>Today's Panchang</Text>
          <View style={styles.panchang}>
            <View style={styles.panchangHeader}>
              <View>
                <Text style={styles.panchangDate}>{new Date().toDateString()}</Text>
                <Text style={styles.panchangSub}>Auspicious timings</Text>
              </View>
              <View style={styles.auspiciousChip}><Text style={styles.auspiciousText}>Shubh</Text></View>
            </View>
            <View style={styles.panchangGrid}>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Tithi</Text><Text style={styles.pVal}>{data?.panchang?.tithi}</Text></View>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Nakshatra</Text><Text style={styles.pVal}>{data?.panchang?.nakshatra}</Text></View>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Sunrise</Text><Text style={styles.pVal}>{data?.panchang?.sunrise}</Text></View>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Sunset</Text><Text style={styles.pVal}>{data?.panchang?.sunset}</Text></View>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Abhijit</Text><Text style={[styles.pVal, { color: theme.color.success }]}>{data?.panchang?.abhijit}</Text></View>
              <View style={styles.panchangItem}><Text style={styles.pKey}>Rahu Kaal</Text><Text style={[styles.pVal, { color: theme.color.error }]}>{data?.panchang?.rahu_kaal}</Text></View>
            </View>
          </View>

          {/* CARD OF THE DAY */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md }]}>Your Card of the Day</Text>
          <Pressable style={styles.tarotCard} onPress={() => setCardRevealed((r) => !r)} testID="card-of-the-day">
            {!cardRevealed ? (
              <LinearGradient colors={[theme.color.brandTertiary, theme.color.surfaceSecondary]} style={StyleSheet.absoluteFill}>
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
          <Text style={[styles.sectionTitle, { paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md }]}>Love Compatibility</Text>
          <View style={styles.compatCard}>
            <View style={styles.compatRow}>
              <View style={styles.compatPill}><Text style={styles.compatSignText}>{sign}</Text></View>
              <View style={styles.compatHeart}>
                <Ionicons name="heart" size={24} color={theme.color.brand} />
                <Text style={styles.compatScore}>{compat?.score ?? '—'}%</Text>
              </View>
              <View style={styles.compatPill}><Text style={styles.compatSignText}>{compatB}</Text></View>
            </View>
            <Text style={styles.compatVerdict}>{compat?.verdict}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: theme.spacing.md }}>
              {ZODIAC.map((z) => (
                <Pressable
                  key={z.sign}
                  testID={`compat-b-${z.sign}`}
                  onPress={() => setCompatB(z.sign)}
                  style={[styles.compatChip, compatB === z.sign && styles.compatChipActive]}
                >
                  <Text style={[styles.compatChipText, compatB === z.sign && { color: theme.color.onBrandPrimary }]}>{z.glyph} {z.sign.slice(0,3)}</Text>
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
                  <Ionicons name="star" size={12} color={theme.color.brand} />
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
          <Text style={[styles.sectionTitle, { paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md }]}>What seekers say</Text>
          <FlatList
            data={data?.testimonials || []}
            horizontal
            keyExtractor={(t) => t.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.testCard} testID={`testimonial-${item.name}`}>
                <View style={styles.testStars}>
                  {Array.from({ length: item.rating }).map((_, i) => (<Ionicons key={i} name="star" size={12} color={theme.color.brand} />))}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  hello: { color: theme.color.onSurfaceTertiary, fontSize: 13 },
  name: { color: theme.color.onSurface, fontSize: 22, fontFamily: theme.font.display, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.color.border },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.brand },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTertiary },
  walletText: { color: theme.color.brand, fontWeight: '800', fontSize: 13 },
  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: theme.spacing.xl, paddingHorizontal: 14, paddingVertical: 12, borderRadius: theme.radius.pill, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  searchPlaceholder: { color: theme.color.muted, fontSize: 14 },
  // Announcement
  announceCard: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start', marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, borderLeftWidth: 3, borderLeftColor: theme.color.brand },
  announceTitle: { color: theme.color.brand, fontWeight: '700', fontSize: 13 },
  announceBody: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  // Sections
  sectionEyebrow: { color: theme.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.3, fontWeight: '700', paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, marginBottom: theme.spacing.md },
  sectionTitle: { color: theme.color.onSurface, fontSize: 20, fontFamily: theme.font.display },
  seeAll: { color: theme.color.brand, fontSize: 13, fontWeight: '600' },
  // Zodiac selector
  zodiacRow: { paddingHorizontal: theme.spacing.xl, gap: 8, alignItems: 'center', paddingBottom: theme.spacing.md },
  signPill: { alignItems: 'center', justifyContent: 'center', minWidth: 56, height: 66, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, paddingHorizontal: 10, flexShrink: 0 },
  signPillActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  signGlyph: { fontSize: 22, color: theme.color.brand },
  signLabel: { color: theme.color.onSurfaceSecondary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  // Hero
  hero: { marginHorizontal: theme.spacing.xl, height: 260, borderRadius: theme.radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  heroContent: { padding: theme.spacing.xl, gap: 6 },
  heroLabel: { color: theme.color.brand, fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  heroTitle: { color: theme.color.onSurface, fontSize: 32, fontFamily: theme.font.display, lineHeight: 36 },
  heroReading: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  luckyRow: { flexDirection: 'row', gap: 6, marginTop: theme.spacing.sm, flexWrap: 'wrap' },
  luckyChip: { backgroundColor: 'rgba(15,14,13,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(214,168,72,0.35)' },
  luckyKey: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 0.6 },
  luckyVal: { color: theme.color.brand, fontSize: 11, fontWeight: '700' },
  // Quick
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.lg },
  quickCard: { width: '47%', backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border },
  quickIcon: { width: 38, height: 38, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  quickLabel: { color: theme.color.onSurface, fontSize: 15, fontWeight: '700' },
  quickSub: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  // Promo
  promoBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, borderWidth: 1, borderColor: theme.color.brandSecondary },
  promoIconBox: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: 'rgba(15,14,13,0.5)', alignItems: 'center', justifyContent: 'center' },
  promoTitle: { color: theme.color.brand, fontWeight: '700', fontSize: 14 },
  promoSub: { color: theme.color.onBrandTertiary, fontSize: 12, marginTop: 2 },
  // Live pulse
  pulseWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: theme.color.success, opacity: 0.35 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.success },
  // Live cards
  liveCard: { width: 140, padding: theme.spacing.sm, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  liveAvatarWrap: { position: 'relative' },
  liveAvatar: { width: '100%', aspectRatio: 1, borderRadius: theme.radius.md },
  liveBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: theme.color.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  liveName: { color: theme.color.onSurface, fontWeight: '700', marginTop: 8, fontSize: 13 },
  liveSpec: { color: theme.color.brand, fontSize: 11, marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  rateText: { color: theme.color.onSurface, fontSize: 11, fontWeight: '600' },
  rateDot: { color: theme.color.onSurfaceTertiary, marginHorizontal: 2 },
  // Concerns
  concernsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  concernCard: { width: '22.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  concernIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  concernLabel: { color: theme.color.onSurface, fontSize: 11, fontWeight: '600' },
  // Panchang
  panchang: { marginHorizontal: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  panchangHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  panchangDate: { color: theme.color.onSurface, fontWeight: '700' },
  panchangSub: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  auspiciousChip: { backgroundColor: theme.color.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
  auspiciousText: { color: theme.color.onBrandPrimary, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  panchangGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  panchangItem: { width: '32%', padding: theme.spacing.sm, backgroundColor: theme.color.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.border },
  pKey: { color: theme.color.onSurfaceTertiary, fontSize: 10, letterSpacing: 0.5 },
  pVal: { color: theme.color.onSurface, fontSize: 13, fontWeight: '700', marginTop: 2 },
  // Tarot
  tarotCard: { marginHorizontal: theme.spacing.xl, height: 200, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.color.brandSecondary, justifyContent: 'center', alignItems: 'center' },
  tarotBackContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  tarotBackGlyph: { color: theme.color.brand, fontSize: 64 },
  tarotBackText: { color: theme.color.onSurfaceSecondary, letterSpacing: 1.5, fontSize: 12, fontWeight: '700' },
  tarotFront: { padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm },
  tarotName: { color: theme.color.brand, fontSize: 26, fontFamily: theme.font.display },
  tarotMeaning: { color: theme.color.onSurfaceSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  tarotHint: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: theme.spacing.sm },
  // Compat
  compatCard: { marginHorizontal: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  compatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  compatPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, borderWidth: 1, borderColor: theme.color.brandSecondary },
  compatSignText: { color: theme.color.brand, fontWeight: '700' },
  compatHeart: { alignItems: 'center', gap: 4 },
  compatScore: { color: theme.color.onSurface, fontSize: 20, fontFamily: theme.font.display },
  compatVerdict: { color: theme.color.onSurfaceSecondary, textAlign: 'center', fontSize: 13 },
  compatChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.borderStrong, flexShrink: 0 },
  compatChipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  compatChipText: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: '600' },
  // Top astro row
  topAstroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  topAvatar: { width: 52, height: 52, borderRadius: 26 },
  topName: { color: theme.color.onSurface, fontWeight: '700', fontSize: 15 },
  topSpec: { color: theme.color.brand, fontSize: 11, marginTop: 2 },
  topPrice: { alignItems: 'center' },
  topPriceVal: { color: theme.color.brand, fontSize: 18, fontWeight: '800' },
  topPriceMin: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: -3 },
  // Testimonials
  testCard: { width: 260, padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border, gap: 8 },
  testStars: { flexDirection: 'row', gap: 2 },
  testText: { color: theme.color.onSurface, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  testAuthor: { color: theme.color.brand, fontSize: 11, fontWeight: '600' },
  // Wisdom
  wisdomCard: { marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.xxl, padding: theme.spacing.xl, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, borderWidth: 1, borderColor: theme.color.brandSecondary, alignItems: 'center', gap: theme.spacing.sm },
  wisdomQuote: { color: theme.color.brand, fontSize: 18, fontFamily: theme.font.display, textAlign: 'center', lineHeight: 24 },
  wisdomHint: { color: theme.color.onBrandTertiary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
});
