import { readStoredValue } from './storage';

export type ThemePreference = 'light' | 'dark' | 'system';

// Mantenha a chave em sincronia com o script inline do index.html.
export const THEME_STORAGE_KEY = 'valora.theme';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
export const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredThemePreference(): ThemePreference {
  const storedValue = readStoredValue(THEME_STORAGE_KEY);
  return isThemePreference(storedValue) ? storedValue : DEFAULT_THEME_PREFERENCE;
}

export function shouldUseDarkTheme(preference: ThemePreference): boolean {
  if (preference === 'system') return window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches;
  return preference === 'dark';
}
