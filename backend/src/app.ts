import Fastify, { type FastifyInstance, LogController } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { DestinationStream } from 'pino';

import type { Database } from './db/database.js';
import { HealthRepository } from './modules/health/health.repository.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { HealthService } from './modules/health/health.service.js';
import type { Config } from './shared/config.js';
import { registerErrorHandlers } from './shared/error-handler.js';
import { buildLoggerOptions } from './shared/logger.js';
import { registerRequestLog } from './shared/request-log.js';

export const API_PREFIX = '/api/v1';

export interface AppDependencies {
  readonly config: Config;
  readonly database: Database;
  readonly logStream?: DestinationStream;
}

export function buildApp({ config, database, logStream }: AppDependencies): FastifyInstance {
  const app = Fastify({
    logger: buildLoggerOptions(config, logStream),
    // A linha por requisição vem do registerRequestLog, sem os campos extras do padrão.
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerRequestLog(app);
  registerErrorHandlers(app);
  app.addHook('onClose', async () => {
    await database.pool.end();
  });

  const healthService = new HealthService(new HealthRepository(database.db));
  app.register(healthRoutes(healthService), { prefix: API_PREFIX });
  return app;
}
