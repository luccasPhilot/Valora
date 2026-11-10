// No Vitest não existe service worker: este arquivo substitui o módulo virtual do vite-plugin-pwa
// (`virtual:pwa-register/react`), que só é resolvido no build. Os testes do aviso de versão
// trocam o módulo por um `vi.mock` próprio.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined] as const,
    offlineReady: [false, () => undefined] as const,
    updateServiceWorker: () => Promise.resolve(),
  };
}
