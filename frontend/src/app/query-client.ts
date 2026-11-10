import { QueryClient } from '@tanstack/react-query';

const STALE_TIME_MS = 60_000;
const RETRY_COUNT = 1;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // `always`: nada espera a rede voltar. Sem rede, as leituras vêm do cache do service worker
      // (ou falham) e as escritas falham na hora, em vez de entrar numa fila que as enviaria
      // horas depois sem o usuário perceber.
      queries: { staleTime: STALE_TIME_MS, retry: RETRY_COUNT, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  });
}
