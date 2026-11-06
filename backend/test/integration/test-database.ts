import { sql } from 'drizzle-orm';
import { inject } from 'vitest';

import { createDatabase, type Database } from '../../src/db/database.js';

export function connectTestDatabase(): Database {
  return createDatabase(inject('databaseUrl'));
}

// Cada teste começa com as tabelas vazias.
export async function truncateAllTables({ db }: Database): Promise<void> {
  await db.execute(sql`
    truncate table
      balance_snapshots, investment_snapshots, category_rules, pluggy_category_mappings,
      budgets, credit_card_bills, transactions, investments, accounts, categories, connections, sync_runs
    restart identity cascade
  `);
}
