import { BACKEND_URL } from './theme';
import { tokenStore } from './tokenStore';

async function request(path: string, opts: RequestInit = {}) {
  const token = await tokenStore.get();
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = typeof data === 'object' && data?.detail ? data.detail : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};

export function wsUrl(chatId: string, token: string) {
  const httpUrl = BACKEND_URL.replace(/^http/, 'ws');
  return `${httpUrl}/api/ws/chat/${chatId}?token=${encodeURIComponent(token)}`;
}
