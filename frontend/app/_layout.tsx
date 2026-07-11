import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from '@/src/AuthContext';
import { ThemeProvider, useTheme } from '@/src/ThemeContext';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { user, loading } = useAuth();
  const t = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.color.surface }} />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.color.surface } }} />;
}

function ShellWithTheme() {
  const t = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.color.surface }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={t.isDark ? 'light' : 'dark'} />
          <RootNav />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <ShellWithTheme />
    </ThemeProvider>
  );
}
