import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../../src/db/database.js';
import { categories, categoryRules, transactions } from '../../src/db/schema.js';
import {
  type CategoriesModule,
  createCategoriesModule,
} from '../../src/modules/categories/categories.module.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { buildSyncHarness, runSync, type SyncHarness } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let database: Database;
let module: CategoriesModule;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  module = createCategoriesModule(database);
  await module.categorySeedService.run();
});

afterEach(async () => {
  await database.pool.end();
});

async function categoryIdOf(seedKey: string): Promise<string> {
  const [row] = await database.db.select().from(categories).where(eq(categories.seedKey, seedKey));
  if (!row) throw new Error(`Teste: categoria ${seedKey} não existe`);
  return row.id;
}

async function insertTransaction(
  accountId: string,
  overrides: Partial<typeof transactions.$inferInsert>,
): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(accountId, overrides))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

async function categorizationOf(transactionId: string) {
  const [row] = await database.db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));
  if (!row) throw new Error('Teste: transação não existe');
  return { categoryId: row.categoryId, source: row.categorySource };
}

describe('categorização na sincronização', () => {
  let harness: SyncHarness;

  beforeEach(() => {
    harness = buildSyncHarness({ database });
  });

  it('should_categorize_new_transactions_by_rule_and_by_pluggy_mapping_when_syncing', async () => {
    // Arrange
    const health = await categoryIdOf('health');
    await module.categoryRulesService.create({
      pattern: 'Farmácia',
      matchType: 'starts_with',
      categoryId: health,
      priority: 0,
    });
    // Act
    await runSync(harness.syncService);
    // Assert
    const rows = await database.db.select().from(transactions);
    const pharmacy = rows.filter((row) => row.descriptionNormalized.startsWith('FARMACIA'));
    expect({
      pharmacyCount: pharmacy.length > 0,
      allByRule: pharmacy.every(
        (row) => row.categoryId === health && row.categorySource === 'rule',
      ),
    }).toEqual({ pharmacyCount: true, allByRule: true });
  });

  it('should_use_the_pluggy_mapping_when_no_rule_matches_a_synced_transaction', async () => {
    // Arrange
    const groceries = await categoryIdOf('groceries');
    // Act
    await runSync(harness.syncService);
    // Assert
    const mapped = (await database.db.select().from(transactions)).filter(
      (row) => row.pluggyCategory === 'Groceries',
    );
    expect({
      hasMapped: mapped.length > 0,
      allByPluggy: mapped.every(
        (row) => row.categoryId === groceries && row.categorySource === 'pluggy',
      ),
    }).toEqual({ hasMapped: true, allByPluggy: true });
  });

  it('should_keep_a_user_category_when_syncing_again', async () => {
    // Arrange
    await runSync(harness.syncService);
    const [target] = await database.db.select().from(transactions).limit(1);
    const leisure = await categoryIdOf('leisure');
    await database.db
      .update(transactions)
      .set({ categoryId: leisure, categorySource: 'user' })
      .where(eq(transactions.id, target?.id ?? ''));
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await categorizationOf(target?.id ?? '')).toEqual({
      categoryId: leisure,
      source: 'user',
    });
  });
});

describe('regra aplicada ao histórico', () => {
  it('should_move_existing_transactions_when_a_matching_rule_is_created', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const netflixIds = await Promise.all(
      [1, 2, 3].map(() => insertTransaction(accountId, { descriptionNormalized: 'NETFLIX.COM' })),
    );
    const subscriptions = await categoryIdOf('subscriptions');
    // Act
    await module.categoryRulesService.create({
      pattern: 'netflix',
      matchType: 'contains',
      categoryId: subscriptions,
      priority: 0,
    });
    // Assert
    const results = await Promise.all(netflixIds.map(categorizationOf));
    expect(results).toEqual(netflixIds.map(() => ({ categoryId: subscriptions, source: 'rule' })));
  });

  it('should_not_touch_a_transaction_with_user_category_when_a_matching_rule_is_created', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const leisure = await categoryIdOf('leisure');
    const userChoiceId = await insertTransaction(accountId, {
      descriptionNormalized: 'NETFLIX.COM',
      categoryId: leisure,
      categorySource: 'user',
    });
    // Act
    await module.categoryRulesService.create({
      pattern: 'NETFLIX',
      matchType: 'contains',
      categoryId: await categoryIdOf('subscriptions'),
      priority: 0,
    });
    // Assert
    expect(await categorizationOf(userChoiceId)).toEqual({ categoryId: leisure, source: 'user' });
  });

  it('should_fall_back_to_the_pluggy_mapping_when_the_rule_is_deleted', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const transactionId = await insertTransaction(accountId, {
      descriptionNormalized: 'MERCADO X',
      pluggyCategory: 'Groceries',
    });
    const rule = await module.categoryRulesService.create({
      pattern: 'MERCADO',
      matchType: 'contains',
      categoryId: await categoryIdOf('shopping'),
      priority: 0,
    });
    // Act
    await module.categoryRulesService.delete(rule.id);
    // Assert
    expect(await categorizationOf(transactionId)).toEqual({
      categoryId: await categoryIdOf('groceries'),
      source: 'pluggy',
    });
  });

  it('should_apply_a_changed_pluggy_mapping_to_existing_transactions', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const transactionId = await insertTransaction(accountId, { pluggyCategory: 'Groceries' });
    const food = await categoryIdOf('food');
    // Act
    await module.pluggyCategoryMappingsService.set('Groceries', food);
    // Assert
    expect(await categorizationOf(transactionId)).toEqual({ categoryId: food, source: 'pluggy' });
  });
});

describe('aprender com a correção', () => {
  it('should_create_an_equals_rule_linked_to_the_source_transaction_when_learning', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const transactionId = await insertTransaction(accountId, {
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    const groceries = await categoryIdOf('groceries');
    // Act
    await module.categoryRulesService.learnFromCorrection(transactionId, groceries);
    // Assert
    const [rule] = await database.db.select().from(categoryRules);
    expect(rule).toMatchObject({
      pattern: 'PAG*JOSEDASILVA',
      matchType: 'equals',
      categoryId: groceries,
      learnedFromTransactionId: transactionId,
    });
  });

  it('should_update_the_same_rule_instead_of_creating_another_when_learning_twice', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const transactionId = await insertTransaction(accountId, {
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    await module.categoryRulesService.learnFromCorrection(
      transactionId,
      await categoryIdOf('groceries'),
    );
    const food = await categoryIdOf('food');
    // Act
    await module.categoryRulesService.learnFromCorrection(transactionId, food);
    // Assert
    const rules = await database.db.select().from(categoryRules);
    expect(rules.map((rule) => rule.categoryId)).toEqual([food]);
  });

  it('should_apply_the_learned_rule_to_other_transactions_with_the_same_description', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    const sourceId = await insertTransaction(accountId, {
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    const otherId = await insertTransaction(accountId, {
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    const groceries = await categoryIdOf('groceries');
    // Act
    await module.categoryRulesService.learnFromCorrection(sourceId, groceries);
    // Assert
    expect(await categorizationOf(otherId)).toEqual({ categoryId: groceries, source: 'rule' });
  });
});
