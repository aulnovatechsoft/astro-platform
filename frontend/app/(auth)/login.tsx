import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/AuthContext';
import { useTheme } from '@/src/ThemeContext';

const BG = 'https://images.unsplash.com/photo-1778660825961-723f13715a79?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85';

export default function Login() {
  const t = useTheme();
  const styles = useStyles();
  const { loginWithGoogle, loginWithPhone, requestOtp } = useAuth();
  const [mode, setMode] = useState<'home' | 'phone'>('home');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onGoogle = async () => {
    setBusy(true); setErr('');
    try { await loginWithGoogle(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const onRequestOtp = async () => {
    if (!phone.trim()) return setErr('Enter phone');
    setBusy(true); setErr('');
    try {
      const code = await requestOtp(phone.trim());
      setOtpSent(true);
      if (code) {
        setDevOtp(code);
        setOtp(code); // demo convenience — real SMS gateway would set DEV_OTP=false
      } else {
        setDevOtp(null);
      }
    }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const onVerify = async () => {
    setBusy(true); setErr('');
    try { await loginWithPhone(phone.trim(), otp.trim(), name.trim() || undefined); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.root}>
      <Image source={BG} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(15,14,13,0.3)', 'rgba(15,14,13,0.85)', t.color.surface]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.brand} testID="app-brand">Aura</Text>
              <Text style={styles.tagline}>Cosmic guidance, whenever you need it.</Text>
            </View>

            <View style={styles.bottom}>
              {mode === 'home' && (
                <>
                  <Pressable
                    testID="login-google-button"
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={onGoogle}
                    disabled={busy}
                  >
                    {busy ? <ActivityIndicator color={t.color.onBrandPrimary} /> : (
                      <>
                        <Ionicons name="logo-google" size={18} color={t.color.onBrandPrimary} />
                        <Text style={styles.primaryText}>Continue with Google</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    testID="login-phone-button"
                    style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setMode('phone')}
                  >
                    <Ionicons name="call-outline" size={18} color={t.color.onSurface} />
                    <Text style={styles.secondaryText}>Continue with Phone</Text>
                  </Pressable>
                </>
              )}

              {mode === 'phone' && (
                <View style={{ gap: t.spacing.md }}>
                  <Text style={styles.formLabel}>Phone number</Text>
                  <TextInput
                    testID="phone-input"
                    style={styles.input}
                    placeholder="+1 555 123 4567"
                    placeholderTextColor={t.color.muted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  {otpSent && (
                    <>
                      <Text style={styles.formLabel}>Name (optional)</Text>
                      <TextInput
                        testID="name-input"
                        style={styles.input}
                        placeholder="Your name"
                        placeholderTextColor={t.color.muted}
                        value={name}
                        onChangeText={setName}
                      />
                      <Text style={styles.formLabel}>
                        {devOtp ? `OTP (demo code: ${devOtp})` : 'OTP'}
                      </Text>
                      <TextInput
                        testID="otp-input"
                        style={styles.input}
                        placeholder="6-digit code"
                        placeholderTextColor={t.color.muted}
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </>
                  )}
                  <Pressable
                    testID={otpSent ? 'verify-otp-button' : 'send-otp-button'}
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={otpSent ? onVerify : onRequestOtp}
                    disabled={busy}
                  >
                    {busy ? <ActivityIndicator color={t.color.onBrandPrimary} /> : (
                      <Text style={styles.primaryText}>{otpSent ? 'Verify & Sign in' : 'Send OTP'}</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => { setMode('home'); setOtpSent(false); setErr(''); }} testID="back-to-login-button">
                    <Text style={styles.link}>← Back</Text>
                  </Pressable>
                </View>
              )}

              {!!err && <Text style={styles.err} testID="login-error">{err}</Text>}
              <Text style={styles.legal}>By continuing you agree to our Terms & Privacy.</Text>
            </View>
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
  scroll: { flexGrow: 1, justifyContent: 'space-between', padding: t.spacing.xl },
  hero: { marginTop: t.spacing.xxxl, alignItems: 'flex-start' },
  brand: { fontSize: 64, color: t.color.brand, fontFamily: t.font.display, letterSpacing: 1 },
  tagline: { color: t.color.onSurfaceSecondary, fontSize: 16, marginTop: t.spacing.sm, maxWidth: 260 },
  bottom: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
  primaryBtn: {
    backgroundColor: t.color.brandPrimary,
    borderRadius: t.radius.pill,
    paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
  },
  primaryText: { color: t.color.onBrandPrimary, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: t.radius.pill, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
    borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: 'rgba(28,26,24,0.6)',
  },
  secondaryText: { color: t.color.onSurface, fontSize: 16, fontWeight: '600' },
  formLabel: { color: t.color.onSurfaceTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: t.color.surfaceSecondary,
    color: t.color.onSurface,
    borderRadius: t.radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: t.color.border,
    fontSize: 16,
  },
  link: { color: t.color.brand, textAlign: 'center', marginTop: t.spacing.sm },
  err: { color: t.color.error, textAlign: 'center' },
  legal: { color: t.color.muted, fontSize: 12, textAlign: 'center', marginTop: t.spacing.sm },
})
  ), [t]);
}
