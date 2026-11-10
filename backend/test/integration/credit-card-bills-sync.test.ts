import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { creditCardBills } from '../../src/db/schema.js';
import { buildBillFixture, type PluggyItemFixture } from '../helpers/fake-pluggy-sdk.js';
import { buildSyncHarness, fixtureOf, runSync, type SyncHarness } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  await harness.app.close();
});

function cardIdOf(fixture: PluggyItemFixture): string {
  const card = fixture.accounts.find((account) => account.type === 'CREDIT');
  if (!card) throw new Error(`Teste: item ${fixture.item.id} sem cartão`);
  return card.id;
}

// As fixtures já trazem faturas reais anonimizadas: aqui ficam só as do teste.
function addBill(paidAmounts: readonly number[] = []) {
  harness.fixtures.forEach((item) => {
    item.bills = [];
  });
  const fixture = fixtureOf(harness.fixtures, 'item-2');
  const accountId = cardIdOf(fixture);
  fixture.bills = [
    buildBillFixture({
      id: 'bill-test-1',
      accountId,
      dueDate: '2026-12-10',
      totalAmount: 1234.56,
      paidAmounts,
    }),
  ];
}

function readBills() {
  return harness.database.db.select().from(creditCardBills);
}

describe('faturas na sincronização', () => {
  it('should_save_the_bill_in_cents_when_pluggy_returns_a_new_bill', async () => {
    // Arrange
    addBill();
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await readBills()).toMatchObject([
      { pluggyBillId: 'bill-test-1', totalCents: 123456, paidCents: 0, dueDate: '2026-12-10' },
    ]);
  });

  it('should_keep_a_single_bill_when_syncing_twice', async () => {
    // Arrange
    addBill();
    await runSync(harness.syncService);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await readBills()).toHaveLength(1);
  });

  it('should_update_the_paid_amount_when_the_bill_gets_a_payment', async () => {
    // Arrange
    addBill();
    await runSync(harness.syncService);
    addBill([500]);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await readBills()).toMatchObject([{ paidCents: 50000 }]);
  });

  it('should_count_saved_bills_in_the_run_stats_when_a_bill_is_saved', async () => {
    // Arrange
    addBill();
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run.stats).toMatchObject({ bills: 1, billsFailed: 0 });
  });

  it('should_save_accounts_and_transactions_when_the_bills_request_fails', async () => {
    // Arrange
    addBill();
    harness.sdk.fetchCreditCardBillsPage = () => Promise.reject(new Error('falha simulada'));
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({ status: run.status, bills: await readBills() }).toEqual({
      status: 'success',
      bills: [],
    });
  });

  it('should_count_a_failed_bill_fetch_per_card_when_the_bills_request_fails', async () => {
    // Arrange
    harness.sdk.fetchCreditCardBillsPage = () => Promise.reject(new Error('falha simulada'));
    const cardCount = harness.fixtures
      .flatMap((fixture) => fixture.accounts)
      .filter((account) => account.type === 'CREDIT').length;
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run.stats?.billsFailed).toBe(cardCount);
  });

  it('should_sync_a_bank_without_bills_when_the_connector_returns_none', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    fixture.bills = [];
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run.status).toBe('success');
  });
});
