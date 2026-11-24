import { buildApp } from './app.js';
import { createDatabase } from './db/database.js';
import { runMigrations } from './db/migrate.js';
import { HealthcheckPinger } from './modules/sync/healthcheck-pinger.js';
import { createPluggySdk } from './modules/sync/pluggy-sdk.js';
import { recoverMissedSync, startSyncSchedule } from './modules/sync/sync.schedule.js';
import { ConfigError, loadConfig } from './shared/config.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const database = createDatabase(config.databaseUrl);
  await runMigrations(database.db);

  const { app, syncService, categorySeedService, accountsService } = buildApp({
    config,
    database,
    pluggySdk: createPluggySdk(config),
  });
  const seedResult = await categorySeedService.run();
  if (seedResult.categoriesCreated > 0) app.log.info(seedResult, 'default categories created');
  if (await accountsService.ensureCashAccount()) app.log.info('cash account created');
  const interruptedRuns = await syncService.failInterruptedRuns();
  if (interruptedRuns > 0) app.log.warn({ interruptedRuns }, 'interrupted sync runs closed');
  await app.listen({ host: config.host, port: config.port });
  const heartbeat = new HealthcheckPinger({
    url: config.healthcheckSyncUrl,
    fetch: globalThis.fetch,
    logger: app.log,
  });
  const scheduleOptions = {
    pattern: config.syncCron,
    sync: syncService,
    logger: app.log,
    heartbeat,
  };
  startSyncSchedule(scheduleOptions);
  // Sem esperar: a API atende enquanto a sincronização do dia é recuperada.
  void recoverMissedSync(scheduleOptions);
}

main().catch((error: unknown) => {
  // ConfigError só cita nomes de variáveis; qualquer outro erro mostra só o tipo.
  const errorType = error instanceof Error ? error.name : 'erro desconhecido';
  console.error(
    error instanceof ConfigError ? error.message : `Falha ao iniciar a API (${errorType}).`,
  );
  process.exit(1);
});
