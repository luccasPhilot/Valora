import { useCallback, useEffect, useRef, useState } from 'react';

const NOTICE_DURATION_MS = 4000;

export interface Notice {
  readonly message: string;
  readonly tone: 'success' | 'error';
}

/** Aviso rápido que some sozinho depois de alguns segundos. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showNotice = useCallback((next: Notice) => {
    window.clearTimeout(timer.current);
    setNotice(next);
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { notice, showNotice };
}
