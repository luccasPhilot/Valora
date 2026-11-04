import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/db/migrate.js';
import { connectTestDatabase } from './test-database.js';

const V1_TABLES = [
  'accounts',
  'balance_snapshots',
  'budgets',
  'categories',
  'category_rules',
  'connections',
  'investment_snapshots',
  'investments',
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

  it('should_create_the_eleven_v1_tables_when_migrations_run_on_an_empty_database', async () => {
    // Arrange (o global-setup já aplicou as migrations num banco vazio)
    // Act
    const tables = await listPublicTables();
    // Assert
    expect(tables).toEqual(V1_TABLES);
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

  it('should_not_register_the_migration_twice_when_migrations_run_again', async () => {
    // Arrange
    await runMigrations(database.db);
    // Act
    const result = await database.db.execute<{ total: string }>(
      sql`select count(*) as total from drizzle.__drizzle_migrations`,
    );
    // Assert
    expect(result.rows[0]?.total).toBe('1');
  });
});
