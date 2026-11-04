import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { readStoredValue, writeStoredValue } from '@/lib/storage';

const HIDE_VALUES_STORAGE_KEY = 'valora.hide-values';
const HIDDEN = 'true';
const VISIBLE = 'false';

interface HideValuesContextValue {
  readonly areValuesHidden: boolean;
  toggleValuesHidden: () => void;
}

interface HideValuesProviderProps {
  children: ReactNode;
}

const HideValuesContext = createContext<HideValuesContextValue | null>(null);

export function HideValuesProvider({ children }: HideValuesProviderProps) {
  const [areValuesHidden, setAreValuesHidden] = useState(
    () => readStoredValue(HIDE_VALUES_STORAGE_KEY) === HIDDEN,
  );

  const toggleValuesHidden = useCallback(() => {
    setAreValuesHidden((wereHidden) => {
      writeStoredValue(HIDE_VALUES_STORAGE_KEY, wereHidden ? VISIBLE : HIDDEN);
      return !wereHidden;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ areValuesHidden, toggleValuesHidden }),
    [areValuesHidden, toggleValuesHidden],
  );

  return <HideValuesContext.Provider value={contextValue}>{children}</HideValuesContext.Provider>;
}

export function useHideValues(): HideValuesContextValue {
  const hideValuesContext = useContext(HideValuesContext);
  if (!hideValuesContext)
    throw new Error('useHideValues deve ser usado dentro do HideValuesProvider');
  return hideValuesContext;
}
