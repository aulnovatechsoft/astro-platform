import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList, TextInput, Animated, Platform } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/AuthContext';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

// Fire a light impact on native; no-op on web.
function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const MOON_BG = 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85';

// Static sign metadata used to enrich the hero card without a backend change.
const SIGN_META: Record<string, { glyph: string; element: string; planet: string; el_color: string }> = {
  Aries:       { glyph: '\u2648', element: 'Fire',  planet: 'Mars',    el_color: '#E85A4F' },
  Taurus:      { glyph: '\u2649', element: 'Earth', planet: 'Venus',   el_color: '#8FA96E' },
  Gemini:      { glyph: '\u264A', element: 'Air',   planet: 'Mercury', el_color: '#7FA9C4' },
  Cancer:      { glyph: '\u264B', element: 'Water', planet: 'Moon',    el_color: '#6E90B3' },
  Leo:         { glyph: '\u264C', element: 'Fire',  planet: 'Sun',     el_color: '#E7A94D' },
  Virgo:       { glyph: '\u264D', element: 'Earth', planet: 'Mercury', el_color: '#8FA96E' },
  Libra:       { glyph: '\u264E', element: 'Air',   planet: 'Venus',   el_color: '#7FA9C4' },
  Scorpio:     { glyph: '\u264F', element: 'Water', planet: 'Pluto',   el_color: '#6E90B3' },
  Sagittarius: { glyph: '\u2650', element: 'Fire',  planet: 'Jupiter', el_color: '#E85A4F' },
  Capricorn:   { glyph: '\u2651', element: 'Earth', planet: 'Saturn',  el_color: '#8FA96E' },
  Aquarius:    { glyph: '\u2652', element: 'Air',   planet: 'Uranus',  el_color: '#7FA9C4' },
  Pisces:      { glyph: '\u2653', element: 'Water', planet: 'Neptune', el_color: '#6E90B3' },
};

// Deterministic 0-100 score keyed by sign + date + slot. Consistent within a day.
function dailyScore(sign: string, slot: string): number {
  const key = `${sign}|${new Date().toDateString()}|${slot}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 60 + (h % 40); // 60..99 — always feels positive
}

// Fallback used until /api/zodiacs resolves (matches backend shape).
const ZODIAC_FALLBACK: Array<{ sign: string; glyph: string; image: string }> = [
  { sign: 'Aries', glyph: '\u2648', image: '' }, { sign: 'Taurus', glyph: '\u2649', image: '' },
  { sign: 'Gemini', glyph: '\u264A', image: '' }, { sign: 'Cancer', glyph: '\u264B', image: '' },
  { sign: 'Leo', glyph: '\u264C', image: '' }, { sign: 'Virgo', glyph: '\u264D', image: '' },
  { sign: 'Libra', glyph: '\u264E', image: '' }, { sign: 'Scorpio', glyph: '\u264F', image: '' },
  { sign: 'Sagittarius', glyph: '\u2650', image: '' }, { sign: 'Capricorn', glyph: '\u2651', image: '' },
  { sign: 'Aquarius', glyph: '\u2652', image: '' }, { sign: 'Pisces', glyph: '\u2653', image: '' },
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

function ZodiacCard({
  z, active, onPress, brand, surface,
}: {
  z: { sign: string; glyph: string; image: string };
  active: boolean;
  onPress: () => void;
  brand: string;
  surface: string;
}) {
  const styles = useStyles();
  const scale = useSharedValue(active ? 1.12 : 1);
  const opacity = useSharedValue(active ? 1 : 0.75);

  useEffect(() => {
    scale.value = withSpring(active ? 1.12 : 1, { damping: 14, stiffness: 220, mass: 0.6 });
    opacity.value = withTiming(active ? 1 : 0.75, { duration: 220 });
  }, [active, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      testID={`home-zodiac-${z.sign}`}
      onPress={() => { lightHaptic(); onPress(); }}
      style={styles.signCard}
      hitSlop={4}
    >
      <Reanimated.View style={animStyle}>
        <View style={[styles.signImgWrap, active && { borderColor: brand }]}>
          {z.image ? (
            <Image source={z.image} style={styles.signImg} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#26262E' }]} />
          )}
          <LinearGradient
            colors={active ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)'] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
          />
          {active && <View style={[styles.signActiveDot, { borderColor: surface }]} />}
        </View>
      </Reanimated.View>
      <Text style={[styles.signCardLabel, active && { color: brand }]}>{z.sign.slice(0, 3)}</Text>
    </Pressable>
  );
}

function ConcernCard({
  c, onPress,
}: {
  c: { key: string; label: string; image: string };
  onPress: () => void;
}) {
  const styles = useStyles();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    scale.value = withSpring(0.94, { damping: 18, stiffness: 320, mass: 0.5 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 });
  };

  return (
    <Reanimated.View style={[styles.concernCardWrap, animStyle]}>
      <Pressable
        testID={`concern-${c.key}`}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => { lightHaptic(); onPress(); }}
        style={styles.concernCardInner}
      >
        <Image source={c.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.concernLabelOverlay}>{c.label}</Text>
      </Pressable>
    </Reanimated.View>
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
  const [zodiacs, setZodiacs] = useState<Array<{ sign: string; glyph: string; image: string }>>(ZODIAC_FALLBACK);

  const load = useCallback(async (s: string) => {
    const d = await api.get(`/api/home-dashboard?sign=${s}`);
    setData(d);
  }, []);

  useEffect(() => { load(sign); }, [sign, load]);
  useEffect(() => {
    api.get(`/api/compatibility?sign1=${sign}&sign2=${compatB}`).then(setCompat).catch(() => {});
  }, [sign, compatB]);
  useEffect(() => {
    api.get('/api/zodiacs').then((z) => Array.isArray(z) && z.length === 12 && setZodiacs(z)).catch(() => {});
  }, []);

  const onRefresh = async () => { setRefreshing(true); try { await load(sign); } finally { setRefreshing(false); } };

  const goAstros = (specialty?: string) => {
    router.push({
      pathname: '/(tabs)/astrologers',
      params: specialty ? { specialty } : {},
    } as any);
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
            {zodiacs.map((z) => (
              <ZodiacCard
                key={z.sign}
                z={z}
                active={sign === z.sign}
                onPress={() => setSign(z.sign)}
                brand={t.color.brand}
                surface={t.color.surface}
              />
            ))}
          </ScrollView>

          {/* HERO HOROSCOPE CARD — editorial layout with sign glyph, energy meter, and daily metrics */}
          {(() => {
            const meta = SIGN_META[data?.horoscope?.sign as string] || SIGN_META.Leo;
            const energy = dailyScore(data?.horoscope?.sign || 'Leo', 'energy');
            const love = dailyScore(data?.horoscope?.sign || 'Leo', 'love');
            const career = dailyScore(data?.horoscope?.sign || 'Leo', 'career');
            const wellness = dailyScore(data?.horoscope?.sign || 'Leo', 'wellness');
            return (
              <Pressable style={styles.hero} onPress={() => router.push('/(tabs)/kundli')} testID="home-hero-card">
                <LinearGradient
                  colors={[t.color.surfaceSecondary, t.color.surface]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Decorative moon on the right — contained, not overlapping text */}
                <View style={styles.heroMoonWrap} pointerEvents="none">
                  <Image source={MOON_BG} style={styles.heroMoon} contentFit="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                {/* Header row: date + element badge */}
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroLabel}>TODAY · {data?.horoscope?.dates}</Text>
                  <View style={[styles.heroElBadge, { borderColor: meta.el_color + '80' }]}>
                    <View style={[styles.heroElDot, { backgroundColor: meta.el_color }]} />
                    <Text style={styles.heroElText}>{meta.element}</Text>
                  </View>
                </View>

                {/* Sign block: glyph + name + planet */}
                <View style={styles.heroSignRow}>
                  <View style={styles.heroGlyphWrap}>
                    <Text style={styles.heroGlyph}>{meta.glyph}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.heroTitle}>{data?.horoscope?.sign}</Text>
                    <Text style={styles.heroPlanet}>Ruled by {meta.planet}</Text>
                  </View>
                  {/* Energy score dial (compact) */}
                  <View style={styles.energyRing}>
                    <Text style={styles.energyVal}>{energy}</Text>
                    <Text style={styles.energyKey}>ENERGY</Text>
                  </View>
                </View>

                <Text style={styles.heroReading} numberOfLines={3}>{data?.horoscope?.reading}</Text>

                {/* Daily metrics bars */}
                <View style={styles.metricsWrap}>
                  {[
                    { key: 'Love', val: love, icon: 'heart' as const },
                    { key: 'Career', val: career, icon: 'briefcase' as const },
                    { key: 'Wellness', val: wellness, icon: 'leaf' as const },
                  ].map((m) => (
                    <View key={m.key} style={styles.metricItem}>
                      <View style={styles.metricHead}>
                        <Ionicons name={m.icon} size={11} color={t.color.brand} />
                        <Text style={styles.metricLabel}>{m.key}</Text>
                        <Text style={styles.metricVal}>{m.val}</Text>
                      </View>
                      <View style={styles.metricTrack}>
                        <View style={[styles.metricFill, { width: `${m.val}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Lucky facts — dense grid */}
                <View style={styles.luckyGrid}>
                  <View style={styles.luckyCell}>
                    <Text style={styles.luckyKey}>COLOR</Text>
                    <Text style={styles.luckyVal}>{data?.horoscope?.lucky_color}</Text>
                  </View>
                  <View style={styles.luckyDivider} />
                  <View style={styles.luckyCell}>
                    <Text style={styles.luckyKey}>NUMBER</Text>
                    <Text style={styles.luckyVal}>{data?.horoscope?.lucky_number}</Text>
                  </View>
                  <View style={styles.luckyDivider} />
                  <View style={styles.luckyCell}>
                    <Text style={styles.luckyKey}>MOOD</Text>
                    <Text style={styles.luckyVal}>{data?.horoscope?.mood}</Text>
                  </View>
                  <View style={styles.luckyDivider} />
                  <View style={styles.luckyCell}>
                    <Text style={styles.luckyKey}>MATCH</Text>
                    <Text style={styles.luckyVal} numberOfLines={1}>{data?.horoscope?.compat}</Text>
                  </View>
                </View>

                <View style={styles.heroCta}>
                  <Text style={styles.heroCtaText}>Read full horoscope</Text>
                  <Ionicons name="arrow-forward" size={14} color={t.color.brand} />
                </View>
              </Pressable>
            );
          })()}

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

          {/* CONCERNS — image-forward cards with press animation */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>Ask about</Text>
          <View style={styles.concernsGrid}>
            {(data?.concerns || []).map((c: any) => (
              <ConcernCard key={c.key} c={c} onPress={() => goAstros(c.specialty)} />
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

          {/* CARD OF THE DAY — compact horizontal, brand-tinted, adds actual context */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xxl, marginBottom: t.spacing.md }]}>Your card of the day</Text>
          <Pressable style={styles.tarotCard} onPress={() => setCardRevealed((r) => !r)} testID="card-of-the-day">
            {!cardRevealed ? (
              <>
                {/* Left tile: decorative tarot back */}
                <LinearGradient
                  colors={[t.color.brandTertiary, t.color.surfaceSecondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.tarotBackLeft}
                >
                  <View style={styles.tarotSparkleTop}><Ionicons name="sparkles" size={12} color={t.color.brand} /></View>
                  <View style={styles.tarotSparkleBot}><Ionicons name="sparkles" size={10} color={t.color.brand} /></View>
                  <View style={styles.tarotBackFrame}>
                    <Text style={styles.tarotBackGlyph}>✦</Text>
                  </View>
                  <Text style={styles.tarotBackLabel}>TAROT</Text>
                </LinearGradient>
                {/* Right content */}
                <View style={styles.tarotRight}>
                  <Text style={styles.tarotEyebrow}>DAILY DRAW</Text>
                  <Text style={styles.tarotHeadline}>A message awaits you</Text>
                  <Text style={styles.tarotBody} numberOfLines={2}>
                    One card, one reflection. Tap to reveal today’s guidance.
                  </Text>
                  <View style={styles.tarotCtaBtn}>
                    <Text style={styles.tarotCtaText}>Reveal card</Text>
                    <Ionicons name="arrow-forward" size={12} color={t.color.onBrandPrimary} />
                  </View>
                </View>
              </>
            ) : (
              <>
                <LinearGradient
                  colors={[t.color.brandTertiary, t.color.surfaceSecondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.tarotBackLeft}
                >
                  <View style={styles.tarotBackFrame}>
                    <Text style={styles.tarotBackGlyph}>✦</Text>
                  </View>
                  <Text style={styles.tarotBackLabel}>{(data?.card_of_the_day?.name || '').toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.tarotRight}>
                  <Text style={styles.tarotEyebrow}>TODAY&apos;S CARD</Text>
                  <Text style={styles.tarotHeadline} numberOfLines={1}>{data?.card_of_the_day?.name}</Text>
                  <Text style={styles.tarotBody} numberOfLines={3}>{data?.card_of_the_day?.meaning}</Text>
                  <Text style={styles.tarotHint}>Tap to flip back</Text>
                </View>
              </>
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
              {zodiacs.map((z) => (
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
  // Hero horoscope — editorial layout
  hero: {
    marginHorizontal: t.spacing.xl,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: t.color.border,
    gap: t.spacing.md,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  heroMoonWrap: {
    position: 'absolute', right: -30, top: -20,
    width: 180, height: 180, borderRadius: 90, overflow: 'hidden',
    opacity: 0.35,
  },
  heroMoon: { width: '100%', height: '100%' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: t.color.brand, fontSize: 10, letterSpacing: 1.6, fontWeight: '800' },
  heroElBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: t.radius.pill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroElDot: { width: 6, height: 6, borderRadius: 3 },
  heroElText: { color: t.color.onSurface, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  heroSignRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  heroGlyphWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: t.color.brandTertiary,
    borderWidth: 1, borderColor: t.color.brandSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  heroGlyph: { color: t.color.brand, fontSize: 30, lineHeight: 34, marginTop: -2 },
  heroTitle: { color: t.color.onSurface, fontSize: 28, fontFamily: t.font.display, lineHeight: 32 },
  heroPlanet: { color: t.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 0.4 },
  energyRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: t.color.brand,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  energyVal: { color: t.color.brand, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  energyKey: { color: t.color.onSurfaceTertiary, fontSize: 7, letterSpacing: 0.8, fontWeight: '700', marginTop: 1 },
  heroReading: { color: t.color.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  metricsWrap: { gap: 8 },
  metricItem: { gap: 4 },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { color: t.color.onSurfaceSecondary, fontSize: 11, fontWeight: '600', flex: 1 },
  metricVal: { color: t.color.brand, fontSize: 11, fontWeight: '800' },
  metricTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  metricFill: { height: '100%', backgroundColor: t.color.brand, borderRadius: 2 },
  luckyGrid: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(214,168,72,0.25)',
    paddingVertical: 8,
  },
  luckyCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4, gap: 2 },
  luckyDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(214,168,72,0.28)', marginVertical: 6 },
  luckyKey: { color: t.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 0.8, fontWeight: '700' },
  luckyVal: { color: t.color.brand, fontSize: 12, fontWeight: '800' },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingTop: 2,
  },
  heroCtaText: { color: t.color.brand, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
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
  // Concerns — image-forward with press animation
  concernsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl },
  concernCardWrap: { width: '30.5%', aspectRatio: 1 },
  concernCardInner: {
    flex: 1, borderRadius: t.radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: t.color.border,
    justifyContent: 'flex-end',
  },
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
  // Tarot — compact horizontal
  tarotCard: {
    marginHorizontal: t.spacing.xl,
    height: 130,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: t.color.border,
    backgroundColor: t.color.surfaceSecondary,
    flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  tarotBackLeft: {
    width: 112,
    alignItems: 'center', justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: t.color.brandSecondary,
  },
  tarotSparkleTop: { position: 'absolute', top: 10, left: 12, opacity: 0.7 },
  tarotSparkleBot: { position: 'absolute', bottom: 12, right: 12, opacity: 0.6 },
  tarotBackFrame: {
    width: 62, height: 62, borderRadius: 10,
    borderWidth: 1, borderColor: t.color.brand,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tarotBackGlyph: { color: t.color.brand, fontSize: 30, lineHeight: 34 },
  tarotBackLabel: {
    marginTop: 8, color: t.color.brand,
    fontSize: 10, letterSpacing: 2, fontWeight: '800',
  },
  tarotRight: {
    flex: 1, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.md,
    justifyContent: 'space-between',
  },
  tarotEyebrow: { color: t.color.brand, fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
  tarotHeadline: { color: t.color.onSurface, fontSize: 15, fontFamily: t.font.display, marginTop: 2 },
  tarotBody: { color: t.color.onSurfaceSecondary, fontSize: 11, lineHeight: 15, marginTop: 4 },
  tarotCtaBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: t.color.brandPrimary,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: t.radius.pill,
    marginTop: 6,
  },
  tarotCtaText: { color: t.color.onBrandPrimary, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  tarotHint: { color: t.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 0.8, marginTop: 4 },
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
