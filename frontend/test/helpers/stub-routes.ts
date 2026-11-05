import { vi } from 'vitest';

export type RouteHandler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/** Troca o `fetch` por respostas prontas, escolhidas por "MÉTODO /caminho" (sem a query). */
export function stubRoutes(routes: Record<string, RouteHandler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const handler = routes[`${init.method ?? 'GET'} ${url.pathname}`];
    if (!handler) return Promise.reject(new Error(`Teste: rota sem resposta ${url.pathname}`));
    return Promise.resolve(handler(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function errorResponse(status: number, code: string): Response {
  return Response.json({ error: { code, message: 'Mensagem de teste', details: [] } }, { status });
}
