import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'dripnow-theme';

const read = (): Theme => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

let current: Theme = read();
const listeners = new Set<() => void>();

const apply = () => { document.documentElement.dataset.theme = current; document.documentElement.style.colorScheme = current; };

/** Call once at startup so every route (storefront, auth, dashboards) shares one theme. */
export function initTheme() { apply(); }

export function setTheme(next: Theme) {
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as Theme);
  const toggle = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}
