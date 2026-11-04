import type { FastifyInstance } from 'fastify';

import { pathWithoutQuery } from './error-handler.js';

// Uma linha por requisição, só com método, caminho, status e duração.
export function registerRequestLog(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        path: pathWithoutQuery(request.url),
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    );
  });
}
