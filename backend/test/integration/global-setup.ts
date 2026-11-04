import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

import { createDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrate.js';

// Mesma versão do infra/compose.dev.yml.
const POSTGRES_IMAGE = 'postgres:18-alpine';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject): Promise<void> {
  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  } catch (error) {
    throw new Error(
      'Os testes de integração precisam do Docker rodando (Docker Desktop no Windows). ' +
        'Para rodar só os testes unitários, use: npm run test:unit',
      { cause: error },
    );
  }
  const databaseUrl = container.getConnectionUri();
  const database = createDatabase(databaseUrl);
  await runMigrations(database.db);
  await database.pool.end();
  project.provide('databaseUrl', databaseUrl);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
