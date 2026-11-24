import type { FastifyInstance } from 'fastify';

import { pathWithoutQuery } from './error-handler.js';

const HTTP_OK = 200;

export interface RequestLogOptions {
  /**
   * Caminho que não vai para o log quando responde 200: o healthcheck do Docker a cada 10 s
   * encheria o log. Com outro status ele continua no log, porque é quando alguém vai procurar.
   */
  readonly quietPath: string;
}

// Uma linha por requisição, só com método, caminho, status e duração.
export function registerRequestLog(app: FastifyInstance, { quietPath }: RequestLogOptions): void {
  app.addHook('onResponse', async (request, reply) => {
    const path = pathWithoutQuery(request.url);
    if (path === quietPath && reply.statusCode === HTTP_OK) return;
    request.log.info(
      {
        method: request.method,
        path,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    );
  });
}
