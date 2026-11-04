import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { writeStoredValue } from '@/lib/storage';
import {
  DARK_COLOR_SCHEME_QUERY,
  readStoredThemePreference,
  shouldUseDarkTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  readonly preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(preference: ThemePreference): void {
  document.documentElement.classList.toggle('dark', shouldUseDarkTheme(preference));
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredThemePreference);

  useEffect(() => {
    applyThemeClass(preference);
    if (preference !== 'system') return;
    const mediaQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY);
    const handleSystemChange = () => applyThemeClass('system');
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    writeStoredValue(THEME_STORAGE_KEY, nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const contextValue = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) throw new Error('useTheme deve ser usado dentro do ThemeProvider');
  return themeContext;
}
