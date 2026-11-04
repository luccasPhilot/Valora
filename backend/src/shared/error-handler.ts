import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { AppError, type ErrorDetail } from './errors.js';

const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;

interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: readonly ErrorDetail[];
  };
}

function errorBody(code: string, message: string, details: readonly ErrorDetail[] = []): ErrorBody {
  return { error: { code, message, details } };
}

export function pathWithoutQuery(url: string): string {
  return url.split('?')[0] ?? url;
}

function toFieldName(instancePath: string): string {
  return instancePath.replace(/^\//, '').replaceAll('/', '.');
}

function sendError(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(errorBody(error.code, error.message, error.details));
  }
  if (hasZodFastifySchemaValidationErrors(error)) {
    const details = error.validation.map((issue) => ({
      field: toFieldName(issue.instancePath),
      message: issue.message ?? 'Valor inválido',
    }));
    return reply.status(400).send(errorBody('VALIDATION_ERROR', 'Dados inválidos', details));
  }
  const statusCode = error.statusCode ?? HTTP_SERVER_ERROR_MIN;
  if (statusCode >= HTTP_CLIENT_ERROR_MIN && statusCode < HTTP_SERVER_ERROR_MIN) {
    return reply.status(statusCode).send(errorBody('BAD_REQUEST', 'Requisição inválida'));
  }
  // A mensagem do erro pode ter valores e descrições: o log guarda só o tipo e a rota.
  request.log.error(
    { errorType: error.name, route: pathWithoutQuery(request.url) },
    'unexpected error',
  );
  return reply.status(500).send(errorBody('INTERNAL_ERROR', 'Erro interno do servidor'));
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler(sendError);
  app.setNotFoundHandler((request, reply) => {
    const route = `${request.method} ${pathWithoutQuery(request.url)}`;
    return reply.status(404).send(errorBody('NOT_FOUND', `Rota ${route} não existe`));
  });
}
