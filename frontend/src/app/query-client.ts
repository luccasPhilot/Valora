import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api-client';

const STALE_TIME_MS = 60_000;
const MAX_RETRIES = 1;
const FIRST_SERVER_ERROR_STATUS = 500;
const NETWORK_ERROR_STATUS = 0;

/**
 * Só vale repetir o que pode dar certo na segunda vez: a rede que caiu e o servidor que respondeu 5xx.
 * Um 4xx ou uma resposta fora do contrato vai dar o mesmo resultado, então o erro aparece na hora.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof ApiError)) return false;
  return error.status === NETWORK_ERROR_STATUS || error.status >= FIRST_SERVER_ERROR_STATUS;
}

function retryWhenRetryable(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(error);
}

interface QueryClientOptions {
  /** Os testes desligam a repetição: o erro aparece na hora, sem esperar o intervalo real. */
  readonly retry?: false;
}

export function createQueryClient({ retry }: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // `always`: nada espera a rede voltar. Sem rede, as leituras vêm do cache do service worker
      // (ou falham) e as escritas falham na hora, em vez de entrar numa fila que as enviaria
      // horas depois sem o usuário perceber.
      queries: {
        staleTime: STALE_TIME_MS,
        retry: retry ?? retryWhenRetryable,
        networkMode: 'always',
      },
      mutations: { networkMode: 'always' },
    },
  });
}
