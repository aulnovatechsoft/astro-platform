import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'aura_session_token';

async function webSet(k: string, v: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(k, v);
}
async function webGet(k: string) {
  if (typeof window !== 'undefined') return window.localStorage.getItem(k);
  return null;
}
async function webDel(k: string) {
  if (typeof window !== 'undefined') window.localStorage.removeItem(k);
}

export const tokenStore = {
  async set(v: string) {
    if (Platform.OS === 'web') return webSet(KEY, v);
    await SecureStore.setItemAsync(KEY, v);
  },
  async get() {
    if (Platform.OS === 'web') return webGet(KEY);
    return SecureStore.getItemAsync(KEY);
  },
  async clear() {
    if (Platform.OS === 'web') return webDel(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};
