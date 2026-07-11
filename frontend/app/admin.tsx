import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useTheme } from '@/src/ThemeContext';

export default function Admin() {
  const t = useTheme();
  const styles = useStyles();
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setItems(await api.get('/api/announcements'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user?.is_admin) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={t.color.onSurface} /></Pressable>
            <Text style={styles.headerTitle}>Admin</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ padding: t.spacing.xl, alignItems: 'center', marginTop: 80 }}>
            <Ionicons name="lock-closed" size={40} color={t.color.onSurfaceTertiary} />
            <Text style={styles.deniedTitle}>Admin only</Text>
            <Text style={styles.deniedSub}>Log in with an admin account to post announcements.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const publish = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title and body required'); return; }
    setBusy(true); setErr('');
    try {
      await api.post('/api/admin/announcements', { title: title.trim(), body: body.trim() });
      setTitle(''); setBody(''); await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await api.del(`/api/admin/announcements/${id}`);
    await load();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="admin-back"><Ionicons name="chevron-back" size={22} color={t.color.onSurface} /></Pressable>
          <Text style={styles.headerTitle}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: t.spacing.xl, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Post an announcement</Text>
              <TextInput testID="admin-title" style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={t.color.muted} />
              <TextInput testID="admin-body" style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="Message body…" placeholderTextColor={t.color.muted} multiline />
              {!!err && <Text style={styles.err}>{err}</Text>}
              <Pressable testID="admin-publish" style={styles.publishBtn} onPress={publish} disabled={busy}>
                {busy ? <ActivityIndicator color={t.color.onBrandPrimary} /> : <Text style={styles.publishText}>Publish</Text>}
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Live announcements</Text>
            {items.map((it) => (
              <View key={it.announcement_id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{it.title}</Text>
                  <Text style={styles.itemBody}>{it.body}</Text>
                </View>
                <Pressable onPress={() => remove(it.announcement_id)} testID={`delete-${it.announcement_id}`} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={t.color.error} />
                </Pressable>
              </View>
            ))}
            {items.length === 0 && <Text style={styles.empty}>No announcements yet.</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.surfaceSecondary },
  headerTitle: { color: t.color.onSurface, fontSize: 18, fontWeight: '700' },
  formCard: { padding: t.spacing.lg, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border, gap: t.spacing.sm },
  formTitle: { color: t.color.onSurface, fontSize: 16, fontWeight: '700', marginBottom: t.spacing.xs },
  input: { backgroundColor: t.color.surface, color: t.color.onSurface, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: t.color.border, fontSize: 15 },
  publishBtn: { marginTop: t.spacing.sm, backgroundColor: t.color.brand, paddingVertical: 14, borderRadius: t.radius.pill, alignItems: 'center' },
  publishText: { color: t.color.onBrandPrimary, fontWeight: '700' },
  err: { color: t.color.error, fontSize: 12 },
  sectionTitle: { color: t.color.onSurface, fontSize: 18, fontFamily: t.font.display, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
  item: { flexDirection: 'row', gap: t.spacing.md, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.color.surfaceSecondary, borderWidth: 1, borderColor: t.color.border, marginBottom: t.spacing.sm },
  itemTitle: { color: t.color.brand, fontWeight: '700' },
  itemBody: { color: t.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(158,62,62,0.15)' },
  empty: { color: t.color.onSurfaceTertiary, fontStyle: 'italic', textAlign: 'center' },
  deniedTitle: { color: t.color.onSurface, fontSize: 20, fontWeight: '700', marginTop: t.spacing.md },
  deniedSub: { color: t.color.onSurfaceTertiary, textAlign: 'center', marginTop: 6 },
})
  ), [t]);
}
