import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const ZODIAC_ICONS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export default function Kundli() {
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
                {loadingReading ? <ActivityIndicator color={theme.color.brand} /> : (
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
              <TextInput testID="kundli-name" style={styles.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={theme.color.muted} />
              <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
              <TextInput testID="kundli-date" style={styles.input} value={date} onChangeText={setDate} placeholder="1995-06-15" placeholderTextColor={theme.color.muted} />
              <Text style={styles.label}>Time of birth (HH:MM)</Text>
              <TextInput testID="kundli-time" style={styles.input} value={time} onChangeText={setTime} placeholder="08:30" placeholderTextColor={theme.color.muted} />
              <Text style={styles.label}>Place of birth</Text>
              <TextInput testID="kundli-place" style={styles.input} value={place} onChangeText={setPlace} placeholder="City, Country" placeholderTextColor={theme.color.muted} />
              <Pressable
                testID="generate-kundli-btn"
                style={styles.generateBtn}
                onPress={generateKundli}
                disabled={kundliBusy}
              >
                {kundliBusy ? <ActivityIndicator color={theme.color.onBrandPrimary} /> :
                  <><Ionicons name="planet" size={16} color={theme.color.onBrandPrimary} /><Text style={styles.generateText}>Calculate Chart</Text></>}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  headerWrap: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  title: { color: theme.color.onSurface, fontSize: 30, fontFamily: theme.font.display },
  subtitle: { color: theme.color.onSurfaceTertiary, marginTop: 4 },
  sectionTitle: { color: theme.color.onSurface, fontSize: 18, fontFamily: theme.font.display, paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  zodiacRow: { paddingHorizontal: theme.spacing.xl, gap: theme.spacing.sm },
  signCard: {
    width: 70, height: 90, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
    gap: 6,
  },
  signCardActive: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTertiary },
  signGlyph: { fontSize: 28, color: theme.color.brand },
  signName: { color: theme.color.onSurfaceSecondary, fontSize: 11, fontWeight: '600' },
  readingCard: {
    margin: theme.spacing.xl, marginTop: theme.spacing.md,
    padding: theme.spacing.lg, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border,
  },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  readingSign: { color: theme.color.brand, fontWeight: '700' },
  readingDate: { color: theme.color.onSurfaceTertiary, fontSize: 12 },
  readingText: { color: theme.color.onSurfaceSecondary, fontSize: 15, lineHeight: 22 },
  formCard: { marginHorizontal: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, gap: theme.spacing.sm },
  label: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: theme.spacing.xs },
  input: { backgroundColor: theme.color.surface, color: theme.color.onSurface, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme.color.border, fontSize: 15 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.color.brand, paddingVertical: 14, borderRadius: theme.radius.pill, marginTop: theme.spacing.md },
  generateText: { color: theme.color.onBrandPrimary, fontWeight: '700' },
  kundliResult: { margin: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, borderWidth: 1, borderColor: theme.color.brandSecondary, gap: theme.spacing.md },
  kundliHead: {},
  kundliName: { color: theme.color.brand, fontSize: 20, fontFamily: theme.font.display },
  kundliMeta: { color: theme.color.onBrandTertiary, fontSize: 12, marginTop: 4 },
  kundliSummary: { color: theme.color.onSurface, lineHeight: 20 },
  planetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  planet: { width: '30%', padding: theme.spacing.sm, backgroundColor: 'rgba(15,14,13,0.4)', borderRadius: theme.radius.sm },
  planetName: { color: theme.color.brand, fontSize: 12, fontWeight: '700' },
  planetSign: { color: theme.color.onSurface, fontSize: 13, marginTop: 2 },
  planetHouse: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: 2 },
});
