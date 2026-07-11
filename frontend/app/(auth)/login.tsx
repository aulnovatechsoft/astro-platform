import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';
import { useAuth } from '@/src/AuthContext';

const BG = 'https://images.unsplash.com/photo-1778660825961-723f13715a79?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85';

export default function Login() {
  const { loginWithGoogle, loginWithPhone, requestOtp } = useAuth();
  const [mode, setMode] = useState<'home' | 'phone'>('home');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
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
    try { await requestOtp(phone.trim()); setOtpSent(true); }
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
        colors={['rgba(15,14,13,0.3)', 'rgba(15,14,13,0.85)', theme.color.surface]}
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
                    {busy ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : (
                      <>
                        <Ionicons name="logo-google" size={18} color={theme.color.onBrandPrimary} />
                        <Text style={styles.primaryText}>Continue with Google</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    testID="login-phone-button"
                    style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setMode('phone')}
                  >
                    <Ionicons name="call-outline" size={18} color={theme.color.onSurface} />
                    <Text style={styles.secondaryText}>Continue with Phone</Text>
                  </Pressable>
                </>
              )}

              {mode === 'phone' && (
                <View style={{ gap: theme.spacing.md }}>
                  <Text style={styles.formLabel}>Phone number</Text>
                  <TextInput
                    testID="phone-input"
                    style={styles.input}
                    placeholder="+1 555 123 4567"
                    placeholderTextColor={theme.color.muted}
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
                        placeholderTextColor={theme.color.muted}
                        value={name}
                        onChangeText={setName}
                      />
                      <Text style={styles.formLabel}>OTP (use 123456)</Text>
                      <TextInput
                        testID="otp-input"
                        style={styles.input}
                        placeholder="6-digit code"
                        placeholderTextColor={theme.color.muted}
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
                    {busy ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : (
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { flexGrow: 1, justifyContent: 'space-between', padding: theme.spacing.xl },
  hero: { marginTop: theme.spacing.xxxl, alignItems: 'flex-start' },
  brand: { fontSize: 64, color: theme.color.brand, fontFamily: theme.font.display, letterSpacing: 1 },
  tagline: { color: theme.color.onSurfaceSecondary, fontSize: 16, marginTop: theme.spacing.sm, maxWidth: 260 },
  bottom: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  primaryBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
  },
  primaryText: { color: theme.color.onBrandPrimary, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: theme.radius.pill, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10,
    borderWidth: 1, borderColor: theme.color.borderStrong, backgroundColor: 'rgba(28,26,24,0.6)',
  },
  secondaryText: { color: theme.color.onSurface, fontSize: 16, fontWeight: '600' },
  formLabel: { color: theme.color.onSurfaceTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: theme.color.surfaceSecondary,
    color: theme.color.onSurface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: theme.color.border,
    fontSize: 16,
  },
  link: { color: theme.color.brand, textAlign: 'center', marginTop: theme.spacing.sm },
  err: { color: theme.color.error, textAlign: 'center' },
  legal: { color: theme.color.muted, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.sm },
});
