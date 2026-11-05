import { z } from 'zod';

const API_BASE_PATH = '/api/v1';
const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
const UNEXPECTED_ERROR_CODE = 'UNEXPECTED_ERROR';

// Formato padrão de erro da API: { "error": { "code", "message", "details" } }.
const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).default([]),
  }),
});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: readonly unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = apiErrorBodySchema.safeParse(await response.json().catch(() => null));
  if (!body.success) {
    return new ApiError(
      response.status,
      UNEXPECTED_ERROR_CODE,
      `Resposta inesperada (HTTP ${response.status})`,
    );
  }
  const { code, message, details } = body.data.error;
  return new ApiError(response.status, code, message, details);
}

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function fetchOrThrow(
  path: string,
  method: RequestMethod,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${API_BASE_PATH}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(0, NETWORK_ERROR_CODE, `Sem conexão com a API em ${path}`, [error]);
  }
}

async function apiRequest<T>(
  method: RequestMethod,
  path: string,
  responseSchema: z.ZodType<T>,
  body?: unknown,
): Promise<T> {
  const response = await fetchOrThrow(path, method, body);
  if (!response.ok) throw await toApiError(response);
  const parsed = responseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      UNEXPECTED_ERROR_CODE,
      `Resposta fora do contrato em ${path}`,
      parsed.error.issues,
    );
  }
  return parsed.data;
}

export function apiGet<T>(path: string, responseSchema: z.ZodType<T>): Promise<T> {
  return apiRequest('GET', path, responseSchema);
}

export function apiPost<T>(path: string, body: unknown, responseSchema: z.ZodType<T>): Promise<T> {
  return apiRequest('POST', path, responseSchema, body);
}

export function apiPut<T>(path: string, body: unknown, responseSchema: z.ZodType<T>): Promise<T> {
  return apiRequest('PUT', path, responseSchema, body);
}

/** Para as rotas que respondem 204, sem corpo. */
export async function apiDelete(path: string): Promise<void> {
  const response = await fetchOrThrow(path, 'DELETE');
  if (!response.ok) throw await toApiError(response);
}
