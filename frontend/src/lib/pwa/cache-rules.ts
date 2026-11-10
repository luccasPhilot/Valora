// Regras do cache de leitura da API. Ficam aqui, num módulo sem dependências, para o
// vite.config.ts (que gera o service worker) e os testes usarem exatamente os mesmos valores.

export const API_CACHE_NAME = 'valora-api';
export const API_CACHE_MAX_ENTRIES = 100;
export const API_CACHE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
/** Rede mais lenta que isso cai para a resposta guardada. */
export const API_NETWORK_TIMEOUT_SECONDS = 5;

/** Cabeçalho que o service worker acrescenta à resposta guardada: quando os dados foram obtidos. */
export const CACHED_AT_HEADER = 'X-Valora-Cached-At';

// O Workbox compara a expressão com a URL inteira, então ela não pode começar com `^`.
// Fora do cache: o acompanhamento da sincronização (precisa do status de agora) e o health.
export const CACHEABLE_API_PATTERN = /\/api\/v1\/(?!(?:sync-runs|health)(?:[/?]|$))/;

interface ApiRequestLike {
  readonly method: string;
  readonly pathname: string;
}

/** Só leituras (`GET`) da API, menos o que precisa estar sempre fresco. Escritas nunca entram. */
export function shouldCacheApiRequest({ method, pathname }: ApiRequestLike): boolean {
  return method.toUpperCase() === 'GET' && CACHEABLE_API_PATTERN.test(pathname);
}
