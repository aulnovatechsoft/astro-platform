import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Theme, THEMES, ThemeName } from './theme';

const KEY = 'aura_theme_name';

async function loadStored(): Promise<ThemeName | null> {
  try {
    if (Platform.OS === 'web') {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
      return (v as ThemeName) || null;
    }
    const v = await SecureStore.getItemAsync(KEY);
    return (v as ThemeName) || null;
  } catch { return null; }
}

async function saveStored(name: ThemeName) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(KEY, name);
    } else {
      await SecureStore.setItemAsync(KEY, name);
    }
  } catch {}
}

type Ctx = {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (n: ThemeName) => void;
};

const ThemeCtx = createContext<Ctx>({} as any);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to the Ivory (warm-minimal light) theme; existing users keep their stored choice.
  const [themeName, setThemeNameState] = useState<ThemeName>('light');

  useEffect(() => { (async () => { const s = await loadStored(); if (s && THEMES[s]) setThemeNameState(s); })(); }, []);

  const setThemeName = useCallback((n: ThemeName) => {
    setThemeNameState(n);
    saveStored(n);
  }, []);

  const value = useMemo(() => ({ theme: THEMES[themeName], themeName, setThemeName }), [themeName, setThemeName]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx).theme;
export const useThemeName = () => useContext(ThemeCtx).themeName;
export const useSetTheme = () => useContext(ThemeCtx).setThemeName;

// Helper: memoize a StyleSheet factory keyed to theme
export function useThemedStyles<T>(factory: (t: Theme) => T): T {
  const t = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(t), [t]);
}
