import * as React from 'react';

// Abaixo de 1024 px o menu vira um painel que abre por cima (Design System, "Responsividade").
const DESKTOP_BREAKPOINT = 1024;
const MOBILE_MEDIA_QUERY = `(max-width: ${DESKTOP_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

// Lê o matchMedia já na primeira renderização, para o menu não piscar aberto no celular.
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot);
}
