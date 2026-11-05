import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, balanceSnapshots } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database);
});

afterEach(async () => {
  await testApp.app.close();
});

describe('conta "Dinheiro"', () => {
  it('should_create_the_cash_account_without_connection_or_balance_when_none_exists', async () => {
    // Arrange
    // Act
    const wasCreated = await testApp.accountsService.ensureCashAccount();
    // Assert
    const stored = await database.db.select().from(accounts);
    expect({ wasCreated, stored }).toEqual({
      wasCreated: true,
      stored: [
        expect.objectContaining({
          type: 'cash',
          name: 'Dinheiro',
          connectionId: null,
          balanceCents: null,
        }),
      ],
    });
  });

  it('should_keep_a_single_cash_account_when_the_seed_runs_again', async () => {
    // Arrange
    await testApp.accountsService.ensureCashAccount();
    // Act
    const wasCreatedAgain = await testApp.accountsService.ensureCashAccount();
    // Assert
    expect({ wasCreatedAgain, total: await database.db.$count(accounts) }).toEqual({
      wasCreatedAgain: false,
      total: 1,
    });
  });

  it('should_not_create_a_balance_snapshot_when_the_cash_account_is_seeded', async () => {
    // Arrange
    // Act
    await testApp.accountsService.ensureCashAccount();
    // Assert
    expect(await database.db.$count(balanceSnapshots)).toBe(0);
  });

  it('should_list_the_cash_account_without_institution_when_listing_accounts', async () => {
    // Arrange
    await testApp.accountsService.ensureCashAccount();
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/accounts' });
    // Assert
    expect(response.json().items).toEqual([
      { id: expect.any(String), name: 'Dinheiro', type: 'cash', institutionName: null },
    ]);
  });
});
