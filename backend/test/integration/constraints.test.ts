import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { accounts, balanceSnapshots, budgets, transactions } from '../../src/db/schema.js';
import { insertAccount, insertCategory, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

describe('database constraints', () => {
  const database = connectTestDatabase();
  const { db } = database;

  beforeEach(async () => {
    await truncateAllTables(database);
  });

  afterAll(async () => {
    await database.pool.end();
  });

  describe('pluggy ids', () => {
    it('should_reject_the_second_transaction_when_the_pluggy_id_is_repeated', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      const values = transactionValues(accountId, { pluggyTransactionId: 'pluggy-tx-1' });
      await db.insert(transactions).values(values);
      // Act
      const secondInsert = db.insert(transactions).values(values);
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    });

    it('should_accept_many_manual_transactions_when_the_pluggy_id_is_null', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      const manual = transactionValues(accountId, { source: 'manual', pluggyTransactionId: null });
      // Act
      await db.insert(transactions).values([manual, manual]);
      const stored = await db.select().from(transactions);
      // Assert
      expect(stored).toHaveLength(2);
    });

    it('should_accept_many_cash_accounts_when_the_pluggy_account_id_is_null', async () => {
      // Arrange
      const cashAccount = { type: 'cash', name: 'Dinheiro', pluggyAccountId: null };
      // Act
      await db.insert(accounts).values([cashAccount, cashAccount]);
      const stored = await db.select().from(accounts);
      // Assert
      expect(stored).toHaveLength(2);
    });
  });

  describe('closed values', () => {
    it('should_reject_the_transaction_when_the_status_is_unknown', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      // Act
      const insert = db
        .insert(transactions)
        .values(transactionValues(accountId, { status: 'cancelled' }));
      // Assert
      await expect(insert).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });

    it('should_accept_the_cash_type_when_the_account_is_the_cash_account', async () => {
      // Arrange
      const cashAccount = { type: 'cash', name: 'Dinheiro' };
      // Act
      const insert = db.insert(accounts).values(cashAccount);
      // Assert
      await expect(insert).resolves.toBeDefined();
    });

    it('should_reject_the_account_when_the_type_is_unknown', async () => {
      // Arrange
      const wallet = { type: 'wallet', name: 'Carteira' };
      // Act
      const insert = db.insert(accounts).values(wallet);
      // Assert
      await expect(insert).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });
  });

  describe('money', () => {
    it('should_read_back_a_negative_amount_when_the_transaction_is_an_outflow', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      await db.insert(transactions).values(transactionValues(accountId, { amountCents: -8990 }));
      // Act
      const [stored] = await db.select().from(transactions);
      // Assert
      expect(stored?.amountCents).toBe(-8990);
    });
  });

  describe('snapshots', () => {
    it('should_reject_a_second_snapshot_when_the_same_account_and_day_are_inserted_twice', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      const snapshot = { accountId, date: '2026-11-03', balanceCents: 100_00 };
      await db.insert(balanceSnapshots).values(snapshot);
      // Act
      const secondInsert = db.insert(balanceSnapshots).values(snapshot);
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    });

    it('should_update_the_value_when_the_snapshot_is_upserted_on_the_same_day', async () => {
      // Arrange
      const accountId = await insertAccount(db);
      const first = { accountId, date: '2026-11-03', balanceCents: 100_00 };
      await db.insert(balanceSnapshots).values(first);
      // Act
      await db
        .insert(balanceSnapshots)
        .values({ ...first, balanceCents: 250_00 })
        .onConflictDoUpdate({
          target: [balanceSnapshots.accountId, balanceSnapshots.date],
          set: { balanceCents: 250_00 },
        });
      const stored = await db
        .select()
        .from(balanceSnapshots)
        .where(eq(balanceSnapshots.accountId, accountId));
      // Assert
      expect(stored).toEqual([{ ...first, balanceCents: 250_00 }]);
    });
  });

  describe('budgets', () => {
    it('should_accept_the_budget_when_the_month_is_day_one', async () => {
      // Arrange
      const categoryId = await insertCategory(db);
      // Act
      const insert = db
        .insert(budgets)
        .values({ categoryId, month: '2026-11-01', limitCents: 500_00 });
      // Assert
      await expect(insert).resolves.toBeDefined();
    });

    it('should_reject_the_budget_when_the_month_is_not_day_one', async () => {
      // Arrange
      const categoryId = await insertCategory(db);
      // Act
      const insert = db
        .insert(budgets)
        .values({ categoryId, month: '2026-11-15', limitCents: 500_00 });
      // Assert
      await expect(insert).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });

    it('should_reject_a_second_budget_when_the_category_and_month_repeat', async () => {
      // Arrange
      const categoryId = await insertCategory(db);
      const budget = { categoryId, month: '2026-11-01', limitCents: 500_00 };
      await db.insert(budgets).values(budget);
      // Act
      const secondInsert = db.insert(budgets).values(budget);
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    });
  });
});
