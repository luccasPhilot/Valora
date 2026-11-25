import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { balanceSnapshots, transactions } from '../../src/db/schema.js';
import { addDays } from '../../src/shared/dates.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  archiveConnection,
  insertAccountSnapshot,
  insertAccountWith,
  insertConnection,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const DATA_HEALTH_URL = '/api/v1/data-health';
// 24/11/2026 às 10:00 em São Paulo.
const NOW = new Date('2026-11-24T13:00:00Z');

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
});

afterEach(async () => {
  await testApp.app.close();
});

async function getDataHealth() {
  const response = await testApp.app.inject({ method: 'GET', url: DATA_HEALTH_URL });
  return response.json();
}

/** Conta corrente com duas fotos seguidas que não fecham por R$ 120,00. */
async function seedDivergentChecking(connectionId: string): Promise<string> {
  const accountId = await insertAccountWith(database.db, {
    connectionId,
    type: 'checking',
    name: 'Conta corrente',
  });
  await insertAccountSnapshot(database.db, accountId, '2026-11-03', 100_000);
  await insertAccountSnapshot(database.db, accountId, '2026-11-04', 88_000);
  return accountId;
}

describe('GET /api/v1/data-health', () => {
  it('should_return_days_left_when_the_bank_informed_the_consent_expiry', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, {
      institutionName: 'Itaú',
      consentExpiresAt: new Date('2026-12-28T15:00:00Z'),
    });
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body.consents).toEqual([
      {
        connectionId,
        institutionName: 'Itaú',
        expiresAt: '2026-12-28T15:00:00.000Z',
        daysLeft: 34,
      },
    ]);
  });

  it('should_return_null_expiry_when_the_bank_did_not_inform_it', async () => {
    // Arrange
    await insertConnection(database.db, { institutionName: 'Nubank' });
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body.consents).toEqual([
      expect.objectContaining({ institutionName: 'Nubank', expiresAt: null, daysLeft: null }),
    ]);
  });

  it('should_return_a_divergence_with_the_account_name_when_a_transaction_is_missing', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await seedDivergentChecking(connectionId);
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body.divergences).toEqual([
      {
        accountId,
        accountName: 'Conta corrente',
        from: '2026-11-03',
        to: '2026-11-04',
        differenceCents: -12_000,
      },
    ]);
  });

  it('should_return_no_divergence_when_the_posted_transactions_explain_the_balance', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await seedDivergentChecking(connectionId);
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { date: '2026-11-03', amountCents: -12_000 }));
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body.divergences).toEqual([]);
  });

  it('should_return_a_stale_card_when_its_latest_transaction_is_14_days_old', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      name: 'Cartão',
    });
    await insertAccountSnapshot(database.db, accountId, '2026-10-01', -50_000);
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { date: '2026-11-10' }));
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body.staleAccounts).toEqual([
      {
        accountId,
        accountName: 'Cartão',
        lastTransactionDate: '2026-11-10',
        daysWithoutTransactions: 14,
      },
    ]);
  });

  it('should_leave_archived_banks_out_of_every_list', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, {
      consentExpiresAt: new Date('2026-12-28T15:00:00Z'),
    });
    await seedDivergentChecking(connectionId);
    const cardId = await insertAccountWith(database.db, { connectionId, type: 'credit_card' });
    await insertAccountSnapshot(database.db, cardId, '2026-10-01', -50_000);
    await archiveConnection(database.db, connectionId, '2026-11-20T10:00:00Z');
    // Act
    const body = await getDataHealth();
    // Assert
    expect(body).toEqual({ consents: [], divergences: [], staleAccounts: [] });
  });

  it('should_return_only_the_50_most_recent_divergences', async () => {
    // Arrange: em cada conta, um dia não fecha e o seguinte fecha, de 25/09 a 21/11.
    const connectionId = await insertConnection(database.db);
    for (const name of ['Conta A', 'Conta B']) {
      const accountId = await insertAccountWith(database.db, { connectionId, name });
      const days = Array.from({ length: 58 }, (_, index) => addDays('2026-09-25', index));
      await database.db.insert(balanceSnapshots).values(
        days.map((date, index) => ({
          accountId,
          date,
          balanceCents: Math.ceil(index / 2) * 1_000,
        })),
      );
    }
    // Act
    const body = await getDataHealth();
    // Assert
    expect({
      count: body.divergences.length,
      newest: body.divergences[0]?.to,
    }).toEqual({ count: 50, newest: '2026-11-21' });
  });
});
