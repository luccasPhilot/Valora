import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  accounts,
  balanceSnapshots,
  budgets,
  goalLinks,
  goals,
  investments,
  transactions,
} from '../../src/db/schema.js';
import {
  insertAccount,
  insertCategory,
  insertConnection,
  insertInvestmentWith,
  transactionValues,
} from './fixtures.js';
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

    it('should_accept_many_accounts_when_the_pluggy_account_id_is_null', async () => {
      // Arrange
      const unlinkedAccount = { type: 'checking', name: 'Sem id do Pluggy', pluggyAccountId: null };
      // Act
      await db.insert(accounts).values([unlinkedAccount, unlinkedAccount]);
      const stored = await db.select().from(accounts);
      // Assert
      expect(stored).toHaveLength(2);
    });

    it('should_reject_a_second_cash_account_when_one_already_exists', async () => {
      // Arrange
      const cashAccount = { type: 'cash', name: 'Dinheiro' };
      await db.insert(accounts).values(cashAccount);
      // Act
      const secondInsert = db.insert(accounts).values(cashAccount);
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
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

  describe('goal links', () => {
    async function insertGoal(): Promise<string> {
      const [goal] = await db
        .insert(goals)
        .values({ name: 'Reserva', icon: 'piggy-bank', targetCents: 10_000_00 })
        .returning({ id: goals.id });
      if (!goal) throw new Error('Fixture: meta não foi criada');
      return goal.id;
    }

    async function insertInvestment(): Promise<string> {
      const connectionId = await insertConnection(db);
      return insertInvestmentWith(db, connectionId, 5_000_00);
    }

    it('should_reject_the_link_when_account_and_investment_are_both_filled', async () => {
      // Arrange
      const goalId = await insertGoal();
      const accountId = await insertAccount(db);
      const investmentId = await insertInvestment();
      // Act
      const insert = db.insert(goalLinks).values({ goalId, accountId, investmentId });
      // Assert
      await expect(insert).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });

    it('should_reject_the_link_when_account_and_investment_are_both_null', async () => {
      // Arrange
      const goalId = await insertGoal();
      // Act
      const insert = db.insert(goalLinks).values({ goalId });
      // Assert
      await expect(insert).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });

    it('should_reject_the_second_link_when_the_same_account_repeats_in_the_goal', async () => {
      // Arrange
      const goalId = await insertGoal();
      const accountId = await insertAccount(db);
      await db.insert(goalLinks).values({ goalId, accountId });
      // Act
      const secondInsert = db.insert(goalLinks).values({ goalId, accountId });
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    });

    it('should_reject_the_second_link_when_the_same_investment_repeats_in_the_goal', async () => {
      // Arrange
      const goalId = await insertGoal();
      const investmentId = await insertInvestment();
      await db.insert(goalLinks).values({ goalId, investmentId });
      // Act
      const secondInsert = db.insert(goalLinks).values({ goalId, investmentId });
      // Assert
      await expect(secondInsert).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    });

    it('should_accept_the_same_investment_when_it_is_linked_to_two_goals', async () => {
      // Arrange
      const firstGoalId = await insertGoal();
      const secondGoalId = await insertGoal();
      const investmentId = await insertInvestment();
      // Act
      await db.insert(goalLinks).values([
        { goalId: firstGoalId, investmentId },
        { goalId: secondGoalId, investmentId },
      ]);
      // Assert
      expect(await db.select().from(goalLinks)).toHaveLength(2);
    });

    it('should_delete_only_the_links_when_the_goal_is_deleted', async () => {
      // Arrange
      const goalId = await insertGoal();
      const accountId = await insertAccount(db);
      const investmentId = await insertInvestment();
      await db.insert(goalLinks).values([
        { goalId, accountId },
        { goalId, investmentId },
      ]);
      // Act
      await db.delete(goals).where(eq(goals.id, goalId));
      // Assert
      const remaining = {
        links: await db.select().from(goalLinks),
        accounts: await db.select().from(accounts),
        investments: await db.select().from(investments),
      };
      expect(remaining).toMatchObject({
        links: [],
        accounts: [expect.anything()],
        investments: [expect.anything()],
      });
    });
  });
});
