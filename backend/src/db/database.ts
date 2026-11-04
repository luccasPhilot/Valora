import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

const CONNECTION_TIMEOUT_MS = 3000;

export function createDatabase(databaseUrl: string) {
  // O Pool só conecta na primeira consulta: criar não derruba a API com o banco fora do ar.
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  return { pool, db: drizzle(pool, { schema }) };
}

export type Database = ReturnType<typeof createDatabase>;
export type Db = Database['db'];
