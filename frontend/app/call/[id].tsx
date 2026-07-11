import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [astro, setAstro] = useState<any>(null);
  const [state, setState] = useState<'ringing' | 'live' | 'ended'>('ringing');
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/astrologers/${id}`).then(setAstro);
    const t = setTimeout(() => setState('live'), 2500);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (state !== 'live') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  if (!astro) return <View style={styles.root}><ActivityIndicator color={theme.color.brand} style={{ marginTop: 100 }} /></View>;

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.root}>
      <Image source={astro.avatar} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,14,13,0.75)' }]} />
      <LinearGradient colors={['rgba(15,14,13,0.3)', 'rgba(15,14,13,0.95)']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Text style={styles.label}>{state === 'ringing' ? 'Connecting…' : state === 'live' ? 'Live consultation' : 'Call ended'}</Text>
          <Text style={styles.timer} testID="call-timer">{state === 'live' ? `${mm}:${ss}` : '00:00'}</Text>
        </View>

        <View style={styles.middle}>
          <Image source={astro.avatar} style={styles.bigAvatar} contentFit="cover" />
          <Text style={styles.name}>{astro.name}</Text>
          <Text style={styles.specialty}>{astro.specialties.join(' · ')}</Text>
          <Text style={styles.rate}>${astro.price_per_min}/min</Text>
        </View>

        <View style={styles.controls}>
          <Pressable testID="mute-btn" style={[styles.ctrlBtn, muted && styles.ctrlActive]} onPress={() => setMuted((m) => !m)}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color={muted ? theme.color.onBrandPrimary : theme.color.onSurface} />
          </Pressable>
          <Pressable testID="end-call-btn" style={styles.endBtn} onPress={() => { setState('ended'); router.back(); }}>
            <Ionicons name="call" size={26} color={'#fff'} style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
          <Pressable testID="speaker-btn" style={[styles.ctrlBtn, speaker && styles.ctrlActive]} onPress={() => setSpeaker((s) => !s)}>
            <Ionicons name={speaker ? 'volume-high' : 'volume-medium'} size={22} color={speaker ? theme.color.onBrandPrimary : theme.color.onSurface} />
          </Pressable>
        </View>

        <BlurView tint="dark" intensity={30} style={styles.footerHint}>
          <Text style={styles.hintText}>Voice/video calls are simulated in this demo build.</Text>
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  top: { alignItems: 'center', paddingTop: theme.spacing.xl, gap: theme.spacing.xs },
  label: { color: theme.color.brand, fontSize: 13, letterSpacing: 1.4, fontWeight: '700', textTransform: 'uppercase' },
  timer: { color: theme.color.onSurface, fontSize: 40, fontFamily: theme.font.display },
  middle: { alignItems: 'center', gap: theme.spacing.sm },
  bigAvatar: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: theme.color.brand },
  name: { color: theme.color.onSurface, fontSize: 28, fontFamily: theme.font.display, marginTop: theme.spacing.md },
  specialty: { color: theme.color.brand, fontSize: 14 },
  rate: { color: theme.color.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  ctrlBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ctrlActive: { backgroundColor: theme.color.brand },
  endBtn: { width: 74, height: 74, borderRadius: 37, backgroundColor: theme.color.error, alignItems: 'center', justifyContent: 'center' },
  footerHint: { position: 'absolute', bottom: 4, left: 20, right: 20, borderRadius: theme.radius.pill, padding: 10, alignItems: 'center', overflow: 'hidden' },
  hintText: { color: theme.color.onSurfaceTertiary, fontSize: 11 },
});
