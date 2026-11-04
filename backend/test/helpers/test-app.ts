import type { FastifyInstance } from 'fastify';
import type { DestinationStream } from 'pino';

import { buildApp } from '../../src/app.js';
import { createDatabase, type Database } from '../../src/db/database.js';
import type { Config } from '../../src/shared/config.js';

// Porta 1 nunca tem PostgreSQL. O Pool só conecta numa consulta, então estes testes não precisam do Docker.
const UNREACHABLE_DATABASE_URL = 'postgres://valora:valora@127.0.0.1:1/valora';

const TEST_CONFIG: Config = {
  databaseUrl: UNREACHABLE_DATABASE_URL,
  host: '127.0.0.1',
  port: 3000,
  logLevel: 'info',
};

export type LogLine = Record<string, unknown>;

export interface TestApp {
  readonly app: FastifyInstance;
  readonly logLines: LogLine[];
}

export function buildTestApp(
  database: Database = createDatabase(UNREACHABLE_DATABASE_URL),
): TestApp {
  const logLines: LogLine[] = [];
  const logStream: DestinationStream = {
    write(message: string) {
      logLines.push(JSON.parse(message));
    },
  };
  const app = buildApp({ config: TEST_CONFIG, database, logStream });
  return { app, logLines };
}
