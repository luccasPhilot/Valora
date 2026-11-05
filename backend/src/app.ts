import Fastify, { type FastifyInstance, LogController } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { DestinationStream } from 'pino';

import type { Database } from './db/database.js';
import { AccountsRepository } from './modules/accounts/accounts.repository.js';
import { accountsRoutes } from './modules/accounts/accounts.routes.js';
import { AccountsService } from './modules/accounts/accounts.service.js';
import { createCategoriesModule } from './modules/categories/categories.module.js';
import { categoriesRoutes } from './modules/categories/categories.routes.js';
import { categoryRulesRoutes } from './modules/categories/category-rules.routes.js';
import type { CategorySeedService } from './modules/categories/category-seed.service.js';
import { pluggyCategoryMappingsRoutes } from './modules/categories/pluggy-category-mappings.routes.js';
import { ConnectionsRepository } from './modules/connections/connections.repository.js';
import { connectionsRoutes } from './modules/connections/connections.routes.js';
import { ConnectionsService } from './modules/connections/connections.service.js';
import { HealthRepository } from './modules/health/health.repository.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { HealthService } from './modules/health/health.service.js';
import type { PluggySdk } from './modules/sync/pluggy-sdk.js';
import { createSyncService } from './modules/sync/sync.module.js';
import { syncRoutes } from './modules/sync/sync.routes.js';
import type { SyncService } from './modules/sync/sync.service.js';
import { createTransactionsService } from './modules/transactions/transactions.module.js';
import { transactionsRoutes } from './modules/transactions/transactions.routes.js';
import type { Config } from './shared/config.js';
import { registerErrorHandlers } from './shared/error-handler.js';
import { buildLoggerOptions } from './shared/logger.js';
import { registerRequestLog } from './shared/request-log.js';

export const API_PREFIX = '/api/v1';

export interface AppDependencies {
  readonly config: Config;
  readonly database: Database;
  readonly pluggySdk: PluggySdk;
  readonly logStream?: DestinationStream;
  /** Relógio da sincronização; os testes fixam a data das fixtures. */
  readonly now?: () => Date;
}

export interface ValoraApp {
  readonly app: FastifyInstance;
  /** Exposto para o server.ts ligar o agendamento e fechar execuções interrompidas. */
  readonly syncService: SyncService;
  /** Exposto para o server.ts criar as categorias padrão depois das migrations. */
  readonly categorySeedService: CategorySeedService;
}

export function buildApp(deps: AppDependencies): ValoraApp {
  const app = Fastify({
    logger: buildLoggerOptions(deps.config, deps.logStream),
    // A linha por requisição vem do registerRequestLog, sem os campos extras do padrão.
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerRequestLog(app);
  registerErrorHandlers(app);
  app.addHook('onClose', async () => {
    await deps.database.pool.end();
  });
  const { syncService, categorySeedService } = registerModules(app, deps);
  return { app, syncService, categorySeedService };
}

function registerModules(
  app: FastifyInstance,
  deps: AppDependencies,
): Pick<ValoraApp, 'syncService' | 'categorySeedService'> {
  const { database } = deps;
  const healthService = new HealthService(new HealthRepository(database.db));
  const connectionsService = new ConnectionsService(new ConnectionsRepository(database.db));
  const now = deps.now ?? (() => new Date());
  const syncService = createSyncService({
    config: deps.config,
    database,
    pluggySdk: deps.pluggySdk,
    logger: app.log,
    now,
  });
  app.register(healthRoutes(healthService), { prefix: API_PREFIX });
  app.register(connectionsRoutes(connectionsService), { prefix: API_PREFIX });
  app.register(syncRoutes(syncService), { prefix: API_PREFIX });
  const categories = createCategoriesModule(database);
  app.register(categoriesRoutes(categories.categoriesService), { prefix: API_PREFIX });
  app.register(categoryRulesRoutes(categories.categoryRulesService), { prefix: API_PREFIX });
  app.register(pluggyCategoryMappingsRoutes(categories.pluggyCategoryMappingsService), {
    prefix: API_PREFIX,
  });
  app.register(accountsRoutes(new AccountsService(new AccountsRepository(database.db))), {
    prefix: API_PREFIX,
  });
  const transactionsService = createTransactionsService({
    database,
    categoryRulesService: categories.categoryRulesService,
    now,
  });
  app.register(transactionsRoutes(transactionsService), { prefix: API_PREFIX });
  return { syncService, categorySeedService: categories.categorySeedService };
}
