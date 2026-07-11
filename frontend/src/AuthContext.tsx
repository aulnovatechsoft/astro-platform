import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { api } from './api';
import { tokenStore } from './tokenStore';

type User = {
  user_id: string;
  email?: string;
  phone?: string;
  name: string;
  picture?: string;
  is_admin?: boolean;
  wallet_balance: number;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string, otp: string, name?: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await tokenStore.get();
      if (!token) { setUser(null); return; }
      const u = await api.get('/api/auth/me');
      setUser(u);
    } catch {
      await tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Handle web hash session_id first
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        const search = window.location.search;
        const sidMatch = hash.match(/session_id=([^&]+)/) || search.match(/session_id=([^&]+)/);
        if (sidMatch) {
          try {
            const data = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
              headers: { 'X-Session-ID': sidMatch[1] },
            }).then(r => r.json());
            const resp = await api.post('/api/auth/google', { session_token: data.session_token });
            await tokenStore.set(resp.session_token);
            window.history.replaceState(null, '', window.location.pathname);
          } catch (e) { console.log('web auth failed', e); }
        }
      }
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const loginWithGoogle = useCallback(async () => {
    const redirect = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin + '/' : '')
      : Linking.createURL('');
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
    if (result.type !== 'success' || !result.url) return;
    const url = result.url;
    const m = url.match(/session_id=([^&#]+)/);
    if (!m) return;
    const data = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
      headers: { 'X-Session-ID': m[1] },
    }).then(r => r.json());
    const resp = await api.post('/api/auth/google', { session_token: data.session_token });
    await tokenStore.set(resp.session_token);
    setUser(resp.user);
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    const resp = await api.post('/api/auth/phone/request', { phone });
    // In demo mode the server returns the fresh per-phone OTP so the UI can display it.
    // Once a real SMS gateway is wired (DEV_OTP=false) this field disappears.
    return (resp && resp.dev_otp) ? (resp.dev_otp as string) : null;
  }, []);

  const loginWithPhone = useCallback(async (phone: string, otp: string, name?: string) => {
    const resp = await api.post('/api/auth/phone/verify', { phone, otp, name });
    await tokenStore.set(resp.session_token);
    setUser(resp.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    await tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithPhone, requestOtp, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
