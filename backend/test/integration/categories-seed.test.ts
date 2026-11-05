import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../../src/db/database.js';
import { categories, pluggyCategoryMappings } from '../../src/db/schema.js';
import { transactions } from '../../src/db/schema.js';
import { createCategoriesModule } from '../../src/modules/categories/categories.module.js';
import { DEFAULT_CATEGORIES } from '../../src/modules/categories/seed/default-categories.js';
import { INITIAL_PLUGGY_MAPPINGS } from '../../src/modules/categories/seed/pluggy-category-map.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let database: Database;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
});

afterEach(async () => {
  await database.pool.end();
});

function runSeed() {
  return createCategoriesModule(database).categorySeedService.run();
}

async function categoryBySeedKey(seedKey: string) {
  const [row] = await database.db.select().from(categories).where(eq(categories.seedKey, seedKey));
  if (!row) throw new Error(`Teste: categoria ${seedKey} não existe`);
  return row;
}

describe('seed das categorias padrão', () => {
  it('should_create_every_default_category_with_its_kind_when_the_table_is_empty', async () => {
    // Arrange
    // Act
    await runSeed();
    // Assert
    const rows = await database.db.select().from(categories);
    expect(
      rows.map(({ seedKey, name, kind }) => ({ seedKey, name, kind })).sort(bySeedKey),
    ).toEqual(
      DEFAULT_CATEGORIES.map(({ seedKey, name, kind }) => ({ seedKey, name, kind })).sort(
        bySeedKey,
      ),
    );
  });

  it('should_create_the_initial_pluggy_mapping_when_the_table_is_empty', async () => {
    // Arrange
    // Act
    await runSeed();
    // Assert
    expect(await database.db.$count(pluggyCategoryMappings)).toBe(INITIAL_PLUGGY_MAPPINGS.length);
  });

  it('should_not_duplicate_categories_or_mappings_when_the_seed_runs_twice', async () => {
    // Arrange
    await runSeed();
    // Act
    const secondRun = await runSeed();
    // Assert
    expect({
      secondRun: secondRun.categoriesCreated,
      categories: await database.db.$count(categories),
      mappings: await database.db.$count(pluggyCategoryMappings),
    }).toEqual({
      secondRun: 0,
      categories: DEFAULT_CATEGORIES.length,
      mappings: INITIAL_PLUGGY_MAPPINGS.length,
    });
  });

  it('should_not_recreate_a_category_when_you_renamed_it', async () => {
    // Arrange
    await runSeed();
    const groceries = await categoryBySeedKey('groceries');
    await database.db
      .update(categories)
      .set({ name: 'Supermercado' })
      .where(eq(categories.id, groceries.id));
    // Act
    await runSeed();
    // Assert
    const names = (await database.db.select().from(categories)).map((row) => row.name);
    expect({ hasOldName: names.includes('Mercado'), total: names.length }).toEqual({
      hasOldName: false,
      total: DEFAULT_CATEGORIES.length,
    });
  });

  it('should_not_recreate_a_category_when_you_archived_it', async () => {
    // Arrange
    await runSeed();
    const leisure = await categoryBySeedKey('leisure');
    await database.db
      .update(categories)
      .set({ isArchived: true })
      .where(eq(categories.id, leisure.id));
    // Act
    await runSeed();
    // Assert
    expect((await categoryBySeedKey('leisure')).isArchived).toBe(true);
  });

  it('should_not_bring_back_a_pluggy_mapping_you_cleared_when_the_seed_runs_again', async () => {
    // Arrange
    await runSeed();
    await database.db
      .delete(pluggyCategoryMappings)
      .where(eq(pluggyCategoryMappings.pluggyCategory, 'Groceries'));
    // Act
    await runSeed();
    // Assert
    const remaining = await database.db
      .select()
      .from(pluggyCategoryMappings)
      .where(eq(pluggyCategoryMappings.pluggyCategory, 'Groceries'));
    expect(remaining).toEqual([]);
  });

  it('should_categorize_already_synced_transactions_when_the_default_categories_are_created', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const [inserted] = await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { pluggyCategory: 'Groceries' }))
      .returning({ id: transactions.id });
    // Act
    await runSeed();
    // Assert
    const [row] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, inserted?.id ?? ''));
    const groceries = await categoryBySeedKey('groceries');
    expect({ categoryId: row?.categoryId, source: row?.categorySource }).toEqual({
      categoryId: groceries.id,
      source: 'pluggy',
    });
  });
});

function bySeedKey(first: { seedKey: string | null }, second: { seedKey: string | null }): number {
  return (first.seedKey ?? '').localeCompare(second.seedKey ?? '');
}
