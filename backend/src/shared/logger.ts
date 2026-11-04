import type { FastifyServerOptions } from 'fastify';
import type { DestinationStream } from 'pino';

import type { Config } from './config.js';
import { pathWithoutQuery } from './error-handler.js';

// Só método, caminho sem query e status entram nos logs. Corpo, query, valores e descrições nunca.
export function buildLoggerOptions(
  config: Config,
  stream?: DestinationStream,
): NonNullable<FastifyServerOptions['logger']> {
  return {
    level: config.logLevel,
    stream,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    serializers: {
      req: (request: { method?: string; url?: string }) => ({
        method: request.method,
        path: pathWithoutQuery(request.url ?? ''),
      }),
      res: (response: { statusCode?: number }) => ({ statusCode: response.statusCode }),
    },
  };
}
