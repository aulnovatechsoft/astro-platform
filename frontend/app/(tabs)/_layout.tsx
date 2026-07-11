import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/ThemeContext';

export default function TabsLayout() {
  const t = useTheme();
  const tabBg = t.isDark ? 'rgba(15,14,13,0.92)' : 'rgba(251,249,244,0.94)';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.color.brand,
        tabBarInactiveTintColor: t.color.onSurfaceTertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : tabBg,
          borderTopColor: t.color.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 78,
          paddingTop: 8,
          paddingBottom: 20,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView tint={t.isDark ? 'dark' : 'light'} intensity={70} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tabBg }]} />
          ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="astrologers" options={{ title: 'Astrologers', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} /> }} />
      <Tabs.Screen name="kundli" options={{ title: 'Kundli', tabBarIcon: ({ color, size }) => <Ionicons name="moon" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} /> }} />
    </Tabs>
  );
}
