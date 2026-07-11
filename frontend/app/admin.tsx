import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

export default function Admin() {
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
            <Pressable onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={theme.color.onSurface} /></Pressable>
            <Text style={styles.headerTitle}>Admin</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ padding: theme.spacing.xl, alignItems: 'center', marginTop: 80 }}>
            <Ionicons name="lock-closed" size={40} color={theme.color.onSurfaceTertiary} />
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
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="admin-back"><Ionicons name="chevron-back" size={22} color={theme.color.onSurface} /></Pressable>
          <Text style={styles.headerTitle}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Post an announcement</Text>
              <TextInput testID="admin-title" style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={theme.color.muted} />
              <TextInput testID="admin-body" style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="Message body…" placeholderTextColor={theme.color.muted} multiline />
              {!!err && <Text style={styles.err}>{err}</Text>}
              <Pressable testID="admin-publish" style={styles.publishBtn} onPress={publish} disabled={busy}>
                {busy ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.publishText}>Publish</Text>}
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
                  <Ionicons name="trash-outline" size={16} color={theme.color.error} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surfaceSecondary },
  headerTitle: { color: theme.color.onSurface, fontSize: 18, fontWeight: '700' },
  formCard: { padding: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, gap: theme.spacing.sm },
  formTitle: { color: theme.color.onSurface, fontSize: 16, fontWeight: '700', marginBottom: theme.spacing.xs },
  input: { backgroundColor: theme.color.surface, color: theme.color.onSurface, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: theme.color.border, fontSize: 15 },
  publishBtn: { marginTop: theme.spacing.sm, backgroundColor: theme.color.brand, paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center' },
  publishText: { color: theme.color.onBrandPrimary, fontWeight: '700' },
  err: { color: theme.color.error, fontSize: 12 },
  sectionTitle: { color: theme.color.onSurface, fontSize: 18, fontFamily: theme.font.display, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  item: { flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, marginBottom: theme.spacing.sm },
  itemTitle: { color: theme.color.brand, fontWeight: '700' },
  itemBody: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(158,62,62,0.15)' },
  empty: { color: theme.color.onSurfaceTertiary, fontStyle: 'italic', textAlign: 'center' },
  deniedTitle: { color: theme.color.onSurface, fontSize: 20, fontWeight: '700', marginTop: theme.spacing.md },
  deniedSub: { color: theme.color.onSurfaceTertiary, textAlign: 'center', marginTop: 6 },
});
