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

async function fetchOrThrow(path: string): Promise<Response> {
  try {
    return await fetch(`${API_BASE_PATH}${path}`, { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new ApiError(0, NETWORK_ERROR_CODE, `Sem conexão com a API ao buscar ${path}`, [error]);
  }
}

export async function apiGet<T>(path: string, responseSchema: z.ZodType<T>): Promise<T> {
  const response = await fetchOrThrow(path);
  if (!response.ok) throw await toApiError(response);
  const body = responseSchema.safeParse(await response.json().catch(() => null));
  if (!body.success) {
    throw new ApiError(
      response.status,
      UNEXPECTED_ERROR_CODE,
      `Resposta fora do contrato em ${path}`,
      body.error.issues,
    );
  }
  return body.data;
}
