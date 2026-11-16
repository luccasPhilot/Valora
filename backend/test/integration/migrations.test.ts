import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { runMigrations } from '../../src/db/migrate.js';
import { connectTestDatabase } from './test-database.js';

const JOURNAL_FILE = new URL('../../drizzle/meta/_journal.json', import.meta.url);
const MIGRATION_COUNT = z
  .object({ entries: z.array(z.unknown()) })
  .parse(JSON.parse(readFileSync(JOURNAL_FILE, 'utf-8'))).entries.length;

const TABLES = [
  'accounts',
  'alerts',
  'balance_snapshots',
  'budgets',
  'categories',
  'category_rules',
  'connections',
  'credit_card_bills',
  'goal_contributions',
  'goal_links',
  'goals',
  'investment_snapshots',
  'investments',
  'planned_entries',
  'planned_entry_occurrences',
  'pluggy_category_mappings',
  'sync_runs',
  'transactions',
];

describe('migrations', () => {
  const database = connectTestDatabase();

  afterAll(async () => {
    await database.pool.end();
  });

  async function listPublicTables(): Promise<string[]> {
    const result = await database.db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    return result.rows.map((row) => row.table_name);
  }

  it('should_create_the_seventeen_tables_when_migrations_run_on_an_empty_database', async () => {
    // Arrange (o global-setup já aplicou as migrations num banco vazio)
    // Act
    const tables = await listPublicTables();
    // Assert
    expect(tables).toEqual(TABLES);
  });

  it('should_change_nothing_when_migrations_run_again', async () => {
    // Arrange
    const tablesBefore = await listPublicTables();
    // Act
    await runMigrations(database.db);
    const tablesAfter = await listPublicTables();
    // Assert
    expect(tablesAfter).toEqual(tablesBefore);
  });

  it('should_create_the_nullable_archived_at_column_in_connections', async () => {
    // Arrange
    // Act
    const result = await database.db.execute<{ is_nullable: string; data_type: string }>(
      sql`select is_nullable, data_type from information_schema.columns where table_name = 'connections' and column_name = 'archived_at'`,
    );
    // Assert
    expect(result.rows[0]).toEqual({ is_nullable: 'YES', data_type: 'timestamp with time zone' });
  });

  it('should_accept_the_item_not_found_connection_status', async () => {
    // Arrange
    // Act
    const insert = database.db.execute(
      sql`insert into connections (pluggy_item_id, institution_name, status) values ('migration-check-item', 'Banco', 'item_not_found')`,
    );
    // Assert
    await expect(insert).resolves.toBeDefined();
    await database.db.execute(
      sql`delete from connections where pluggy_item_id = 'migration-check-item'`,
    );
  });

  it('should_still_reject_an_unknown_connection_status', async () => {
    // Arrange
    // Act
    const insert = database.db.execute(
      sql`insert into connections (pluggy_item_id, institution_name, status) values ('migration-check-bad', 'Banco', 'desconhecido')`,
    );
    // Assert
    await expect(insert).rejects.toThrow();
  });

  it('should_not_register_the_migration_twice_when_migrations_run_again', async () => {
    // Arrange
    await runMigrations(database.db);
    // Act
    const result = await database.db.execute<{ total: string }>(
      sql`select count(*) as total from drizzle.__drizzle_migrations`,
    );
    // Assert
    expect(result.rows[0]?.total).toBe(String(MIGRATION_COUNT));
  });
});
