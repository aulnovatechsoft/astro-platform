// Web-only workaround for a long-standing issue in expo-font's browser build.
//
// @expo/vector-icons calls `Font.loadAsync(...)` inside every icon component's
// `componentDidMount`. On web, `expo-font` internally hands that off to
// `fontfaceobserver` with a **hardcoded 6000 ms timeout**. When the browser
// takes longer than 6 s to fetch a .ttf (e.g. on a cold Metro cache the
// MaterialCommunityIcons.ttf is ~1.4 MB), the observer rejects with:
//
//     "6000ms timeout exceeded"
//
// The rejection is never awaited by `componentDidMount`, so React surfaces it
// as an uncaught error in the browser console. The font itself still finishes
// loading via CSS `@font-face`, so this is purely cosmetic — but noisy.
//
// This module does two things (web only):
//   1. Monkey-patches `Font.loadAsync` so a `6000ms timeout exceeded` rejection
//      is caught and resolved. Downstream React state updates then proceed,
//      the icon component paints as soon as the browser finishes fetching.
//   2. Installs a global `unhandledrejection` listener that silences any stray
//      copies of the same message (belt-and-braces for older mounts).
//
// No-op on native.

import { Platform } from 'react-native';

const TIMEOUT_MARKERS = ['timeout exceeded', 'FontFaceObserver'];

function isFontTimeoutError(err: any): boolean {
  const msg = String(err?.message ?? err ?? '');
  return TIMEOUT_MARKERS.some((m) => msg.includes(m));
}

let installed = false;

export function installFontTimeoutShim(): void {
  if (installed || Platform.OS !== 'web' || typeof window === 'undefined') return;
  installed = true;

  // 1) Monkey-patch expo-font.loadAsync so the observer timeout doesn't reject.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Font = require('expo-font');
    const original = Font.loadAsync;
    if (typeof original === 'function' && !(original as any).__timeoutShimmed) {
      const wrapped = function loadAsyncShimmed(...args: any[]) {
        try {
          const p = original.apply(Font, args);
          if (p && typeof (p as Promise<unknown>).catch === 'function') {
            return (p as Promise<unknown>).catch((err) => {
              if (isFontTimeoutError(err)) {
                // Font still finishes loading via CSS; consumers can proceed.
                return undefined;
              }
              throw err;
            });
          }
          return p;
        } catch (err) {
          if (isFontTimeoutError(err)) return Promise.resolve();
          throw err;
        }
      };
      (wrapped as any).__timeoutShimmed = true;
      Font.loadAsync = wrapped;
    }
  } catch {
    /* expo-font not available — ignore */
  }

  // 2) Silence any surviving unhandled rejections carrying the same message.
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isFontTimeoutError(event.reason)) {
      event.preventDefault();
    }
  });
}
