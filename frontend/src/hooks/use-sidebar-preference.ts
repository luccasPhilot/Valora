import { useCallback, useState } from 'react';

import { readStoredValue, writeStoredValue } from '@/lib/storage';

const SIDEBAR_STORAGE_KEY = 'valora.sidebar';
const COLLAPSED_VALUE = 'collapsed';
const EXPANDED_VALUE = 'expanded';

interface SidebarPreference {
  readonly isSidebarOpen: boolean;
  readonly setSidebarOpen: (isOpen: boolean) => void;
}

// A escolha de recolher o menu fica no aparelho. Sem armazenamento, o menu abre expandido.
export function useSidebarPreference(): SidebarPreference {
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => readStoredValue(SIDEBAR_STORAGE_KEY) !== COLLAPSED_VALUE,
  );

  const setSidebarOpen = useCallback((isOpen: boolean) => {
    setIsSidebarOpen(isOpen);
    writeStoredValue(SIDEBAR_STORAGE_KEY, isOpen ? EXPANDED_VALUE : COLLAPSED_VALUE);
  }, []);

  return { isSidebarOpen, setSidebarOpen };
}
