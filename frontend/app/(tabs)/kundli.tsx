import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/src/api';
import { useTheme } from '@/src/ThemeContext';

const ZODIAC_ICONS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export default function Kundli() {
  const t = useTheme();
  const styles = useStyles();
  const [zodiacs, setZodiacs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reading, setReading] = useState<any>(null);
  const [loadingReading, setLoadingReading] = useState(false);

  // Kundli form
  const [name, setName] = useState('');
  const [date, setDate] = useState('1995-06-15');
  const [time, setTime] = useState('08:30');
  const [place, setPlace] = useState('Mumbai, India');
  const [kundli, setKundli] = useState<any>(null);
  const [kundliBusy, setKundliBusy] = useState(false);

  useEffect(() => { api.get('/api/zodiacs').then(setZodiacs); }, []);

  const openSign = async (z: any) => {
    setSelected(z);
    setLoadingReading(true);
    try { setReading(await api.get(`/api/horoscope/${z.sign}`)); }
    finally { setLoadingReading(false); }
  };

  const generateKundli = async () => {
    setKundliBusy(true);
    try { setKundli(await api.post('/api/kundli/generate', { name, date, time, place })); }
    catch (e: any) { setKundli({ error: e.message }); }
    finally { setKundliBusy(false); }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
            <View style={styles.headerWrap}>
              <Text style={styles.title}>Kundli & Horoscope</Text>
              <Text style={styles.subtitle}>Your celestial blueprint</Text>
            </View>

            <Text style={styles.sectionTitle}>Daily Horoscope</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zodiacRow}>
              {zodiacs.map((z) => (
                <Pressable
                  key={z.sign}
                  testID={`zodiac-${z.sign}`}
                  style={[styles.signCard, selected?.sign === z.sign && styles.signCardActive]}
                  onPress={() => openSign(z)}
                >
                  <Text style={styles.signGlyph}>{ZODIAC_ICONS[z.sign]}</Text>
                  <Text style={styles.signName}>{z.sign}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {selected && (
              <View style={styles.readingCard} testID="horoscope-reading">
                {loadingReading ? <ActivityIndicator color={t.color.brand} /> : (
                  <>
                    <View style={styles.readingHeader}>
                      <Text style={styles.readingSign}>{selected.sign} · {selected.element}</Text>
                      <Text style={styles.readingDate}>{reading?.dates}</Text>
                    </View>
                    <Text style={styles.readingText}>{reading?.reading}</Text>
                  </>
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Generate your Kundli</Text>
            <View style={styles.formCard}>
              <Text style={styles.label}>Full name</Text>
              <TextInput testID="kundli-name" style={styles.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={t.color.muted} />
              <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
              <TextInput testID="kundli-date" style={styles.input} value={date} onChangeText={setDate} placeholder="1995-06-15" placeholderTextColor={t.color.muted} />
              <Text style={styles.label}>Time of birth (HH:MM)</Text>
              <TextInput testID="kundli-time" style={styles.input} value={time} onChangeText={setTime} placeholder="08:30" placeholderTextColor={t.color.muted} />
              <Text style={styles.label}>Place of birth</Text>
              <TextInput testID="kundli-place" style={styles.input} value={place} onChangeText={setPlace} placeholder="City, Country" placeholderTextColor={t.color.muted} />
              <Pressable
                testID="generate-kundli-btn"
                style={styles.generateBtn}
                onPress={generateKundli}
                disabled={kundliBusy}
              >
                {kundliBusy ? <ActivityIndicator color={t.color.onBrandPrimary} /> :
                  <><Ionicons name="planet" size={16} color={t.color.onBrandPrimary} /><Text style={styles.generateText}>Calculate Chart</Text></>}
              </Pressable>
            </View>

            {kundli && !kundli.error && (
              <View style={styles.kundliResult} testID="kundli-result">
                <View style={styles.kundliHead}>
                  <Text style={styles.kundliName}>{kundli.name}&apos;s Chart</Text>
                  <Text style={styles.kundliMeta}>Sun {kundli.sun_sign} · Moon {kundli.moon_sign} · Asc {kundli.ascendant}</Text>
                </View>
                <Text style={styles.kundliSummary}>{kundli.summary}</Text>
                <View style={styles.planetsGrid}>
                  {kundli.planets.map((p: any) => (
                    <View key={p.name} style={styles.planet}>
                      <Text style={styles.planetName}>{p.name}</Text>
                      <Text style={styles.planetSign}>{p.sign}</Text>
                      <Text style={styles.planetHouse}>House {p.house}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => (
    StyleSheet.create({
  root: { flex: 1, backgroundColor: t.color.surface },
  headerWrap: { paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.md, paddingBottom: t.spacing.md },
  title: { color: t.color.onSurface, fontSize: 30, fontFamily: t.font.display },
  subtitle: { color: t.color.onSurfaceTertiary, marginTop: 4 },
  sectionTitle: { color: t.color.onSurface, fontSize: 18, fontFamily: t.font.display, paddingHorizontal: t.spacing.xl, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
  zodiacRow: { paddingHorizontal: t.spacing.xl, gap: t.spacing.sm },
  signCard: {
    width: 70, height: 90, borderRadius: t.radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border,
    gap: 6,
  },
  signCardActive: { borderColor: t.color.brand, backgroundColor: t.color.brandTertiary },
  signGlyph: { fontSize: 28, color: t.color.brand },
  signName: { color: t.color.onSurfaceSecondary, fontSize: 11, fontWeight: '600' },
  readingCard: {
    margin: t.spacing.xl, marginTop: t.spacing.md,
    padding: t.spacing.lg, borderRadius: t.radius.md,
    backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border,
  },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: t.spacing.sm },
  readingSign: { color: t.color.brand, fontWeight: '700' },
  readingDate: { color: t.color.onSurfaceTertiary, fontSize: 12 },
  readingText: { color: t.color.onSurfaceSecondary, fontSize: 15, lineHeight: 22 },
  formCard: { marginHorizontal: t.spacing.xl, padding: t.spacing.lg, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border, gap: t.spacing.sm },
  label: { color: t.color.onSurfaceTertiary, fontSize: 12, marginTop: t.spacing.xs },
  input: { backgroundColor: t.color.surface, color: t.color.onSurface, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: t.color.border, fontSize: 15 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.color.brand, paddingVertical: 14, borderRadius: t.radius.pill, marginTop: t.spacing.md },
  generateText: { color: t.color.onBrandPrimary, fontWeight: '700' },
  kundliResult: { margin: t.spacing.xl, padding: t.spacing.lg, borderRadius: t.radius.md, backgroundColor: t.color.brandTertiary, borderWidth: 1, borderColor: t.color.brandSecondary, gap: t.spacing.md },
  kundliHead: {},
  kundliName: { color: t.color.brand, fontSize: 20, fontFamily: t.font.display },
  kundliMeta: { color: t.color.onBrandTertiary, fontSize: 12, marginTop: 4 },
  kundliSummary: { color: t.color.onSurface, lineHeight: 20 },
  planetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: t.spacing.sm },
  planet: { width: '30%', padding: t.spacing.sm, backgroundColor: 'rgba(15,14,13,0.4)', borderRadius: t.radius.sm },
  planetName: { color: t.color.brand, fontSize: 12, fontWeight: '700' },
  planetSign: { color: t.color.onSurface, fontSize: 13, marginTop: 2 },
  planetHouse: { color: t.color.onSurfaceTertiary, fontSize: 10, marginTop: 2 },
})
  ), [t]);
}
