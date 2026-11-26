import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { z } from 'zod';

import { createDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrate.js';
import { connectTestDatabase } from './test-database.js';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));
const JOURNAL_FILE = new URL('../../drizzle/meta/_journal.json', import.meta.url);
const journalSchema = z.looseObject({ entries: z.array(z.looseObject({ tag: z.string() })) });
const JOURNAL = journalSchema.parse(JSON.parse(readFileSync(JOURNAL_FILE, 'utf-8')));
const MIGRATION_COUNT = JOURNAL.entries.length;
const REVIEW_INBOX_MIGRATION = '0012_add_review_inbox';
const REVIEW_CHECK_DATABASE = 'review_migration_check';

/** Cópia da pasta de migrations só até antes de `tag`, para montar um banco no estado anterior. */
function migrationsFolderBefore(tag: string): string {
  const folder = mkdtempSync(join(tmpdir(), 'valora-migrations-'));
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
  const cut = JOURNAL.entries.findIndex((entry) => entry.tag === tag);
  const journal = { ...JOURNAL, entries: JOURNAL.entries.slice(0, cut) };
  writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify(journal));
  return folder;
}

function databaseUrlFor(databaseName: string): string {
  const url = new URL(inject('databaseUrl'));
  url.pathname = `/${databaseName}`;
  return url.toString();
}

const TABLES = [
  'accounts',
  'alerts',
  'balance_snapshots',
  'budgets',
  'categories',
  'category_rules',
  'connections',
  'credit_card_bills',
  'dismissed_rule_suggestions',
  'goal_contributions',
  'goal_links',
  'goals',
  'investment_snapshots',
  'investments',
  'planned_entries',
  'planned_entry_occurrences',
  'pluggy_category_mappings',
  'push_subscriptions',
  'sync_runs',
  'tags',
  'transaction_tags',
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

  it('should_create_every_table_when_migrations_run_on_an_empty_database', async () => {
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

  describe('0012_add_review_inbox', () => {
    async function insertTransactionWithRawSql(
      reviewCheck: ReturnType<typeof createDatabase>,
      description: string,
    ): Promise<void> {
      await reviewCheck.db.execute(sql`
        insert into transactions (account_id, source, date, description, description_normalized, amount_cents, status)
        select id, 'manual', '2026-11-03', ${description}, ${description}, -100, 'posted' from accounts limit 1
      `);
    }

    async function reviewedByDescription(
      reviewCheck: ReturnType<typeof createDatabase>,
    ): Promise<Record<string, boolean>> {
      const result = await reviewCheck.db.execute<{ description: string; is_reviewed: boolean }>(
        sql`select description, reviewed_at is not null as is_reviewed from transactions order by description`,
      );
      return Object.fromEntries(result.rows.map((row) => [row.description, row.is_reviewed]));
    }

    it('should_mark_existing_transactions_as_reviewed_and_leave_new_ones_unreviewed', async () => {
      // Arrange
      await database.db.execute(sql.raw(`drop database if exists ${REVIEW_CHECK_DATABASE}`));
      await database.db.execute(sql.raw(`create database ${REVIEW_CHECK_DATABASE}`));
      const reviewCheck = createDatabase(databaseUrlFor(REVIEW_CHECK_DATABASE));
      const previousFolder = migrationsFolderBefore(REVIEW_INBOX_MIGRATION);
      try {
        await migrate(reviewCheck.db, { migrationsFolder: previousFolder });
        await reviewCheck.db.execute(
          sql`insert into accounts (type, name) values ('cash', 'Dinheiro')`,
        );
        await insertTransactionWithRawSql(reviewCheck, 'antes');
        // Act
        await runMigrations(reviewCheck.db);
        await insertTransactionWithRawSql(reviewCheck, 'depois');
        // Assert
        expect(await reviewedByDescription(reviewCheck)).toEqual({ antes: true, depois: false });
      } finally {
        await reviewCheck.pool.end();
        rmSync(previousFolder, { recursive: true, force: true });
        await database.db.execute(sql.raw(`drop database if exists ${REVIEW_CHECK_DATABASE}`));
      }
    });
  });
});
