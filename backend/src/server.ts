import { buildApp } from './app.js';
import { createDatabase } from './db/database.js';
import { runMigrations } from './db/migrate.js';
import { ConfigError, loadConfig } from './shared/config.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const database = createDatabase(config.databaseUrl);
  await runMigrations(database.db);

  const app = buildApp({ config, database });
  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  // ConfigError só cita nomes de variáveis; qualquer outro erro mostra só o tipo.
  const errorType = error instanceof Error ? error.name : 'erro desconhecido';
  console.error(
    error instanceof ConfigError ? error.message : `Falha ao iniciar a API (${errorType}).`,
  );
  process.exit(1);
});
