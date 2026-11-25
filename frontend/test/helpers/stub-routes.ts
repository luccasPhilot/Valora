import { vi } from 'vitest';

export type RouteHandler = (url: URL, init: RequestInit) => Response | Promise<Response>;

const LAST_SYNC_RUN = {
  id: '99999999-9999-4999-8999-999999999999',
  trigger: 'schedule',
  status: 'success',
  startedAt: '2026-11-04T10:00:00.000Z',
  finishedAt: '2026-11-04T10:02:00.000Z',
  stats: { transactionsInserted: 0 },
};

/**
 * O que o shell (sino, status da sincronização e faixa de conexões) pede em toda tela: sem alerta,
 * sincronizado e sem banco com problema. Cada teste sobrescreve a rota que quiser.
 */
export const SHELL_ROUTES: Readonly<Record<string, RouteHandler>> = {
  'GET /api/v1/alerts': () =>
    Response.json({ items: [], unreadCount: 0, pagination: { page: 1, limit: 50, total: 0 } }),
  'GET /api/v1/sync-runs/latest': () => Response.json(LAST_SYNC_RUN),
  'GET /api/v1/connections': () => Response.json({ items: [] }),
};

/**
 * Troca o `fetch` por respostas prontas, escolhidas por "MÉTODO /caminho" (sem a query). As rotas do
 * shell já têm resposta; qualquer outra sem resposta falha o pedido.
 */
export function stubRoutes(routes: Record<string, RouteHandler>) {
  const allRoutes = { ...SHELL_ROUTES, ...routes };
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const handler = allRoutes[`${init.method ?? 'GET'} ${url.pathname}`];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${url.pathname}`));
    return Promise.resolve(handler(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** As URLs pedidas (com a query) cujo caminho começa por `pathPrefix`, na ordem em que saíram. */
export function requestedUrls(fetchMock: ReturnType<typeof stubRoutes>, pathPrefix: string) {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => new URL(url, 'http://localhost').pathname.startsWith(pathPrefix));
}

export function errorResponse(status: number, code: string): Response {
  return Response.json({ error: { code, message: 'Mensagem de teste', details: [] } }, { status });
}
