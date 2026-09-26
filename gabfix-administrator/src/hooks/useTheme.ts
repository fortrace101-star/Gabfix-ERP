import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/** Local-storage key is scoped per app via VITE_APP_ID to avoid cross-app collisions. */
const storageKey = `gabfix-theme-${import.meta.env.VITE_APP_ID ?? 'default'}`;

/**
 * Dark / light mode controller.
 *
 * On first mount it reads the persisted preference from localStorage (if any),
 * falling back to the user's OS-level `prefers-color-scheme` setting.
 * The chosen theme is applied to `<html data-theme="...">` so every app's
 * CSS variables can react to it via `[data-theme="dark"]` selectors.
 *
 * Per multi-app-plan.md §8: tokens are vendored per app, no shared source imports.
 */
export function useTheme() {
  const [theme, setThemeValue] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme =
      saved === 'dark' || (saved === null && prefersDark) ? 'dark' : 'light';

    setThemeValue(initial);
    document.documentElement.setAttribute('data-theme', initial);
    document.documentElement.style.colorScheme = initial;
    setMounted(true);
  }, []);

  const applyTheme = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
  };

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeValue(next);
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  function setTheme(next: Theme) {
    setThemeValue(next);
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return { theme, toggleTheme, setTheme, mounted };
}
