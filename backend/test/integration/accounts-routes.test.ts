import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertConnection } from './fixtures.js';
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

async function getAccounts() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/accounts' });
  return response.json();
}

async function seedChecking(balanceCents: number): Promise<void> {
  const connectionId = await insertConnection(database.db);
  await insertAccountWith(database.db, { connectionId, type: 'checking', balanceCents });
}

describe('GET /api/v1/accounts', () => {
  it('should_list_the_account_with_balance_and_connection_when_it_exists', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, {
      institutionName: 'Itaú',
      status: 'consent_expired',
      statusDetail: 'Consentimento expirou',
      lastSyncedAt: new Date('2026-11-01T10:00:00Z'),
    });
    const accountId = await insertAccountWith(database.db, {
      connectionId,
      name: 'Conta corrente',
      numberLastDigits: '1234',
      balanceCents: 300000,
    });
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.items).toEqual([
      {
        id: accountId,
        name: 'Conta corrente',
        type: 'checking',
        lastDigits: '1234',
        balanceCents: 300000,
        creditLimitCents: null,
        availableLimitCents: null,
        isHidden: false,
        connection: {
          id: connectionId,
          institutionName: 'Itaú',
          status: 'consent_expired',
          statusDetail: 'Consentimento expirou',
          lastSyncedAt: '2026-11-01T10:00:00.000Z',
        },
      },
    ]);
  });

  it('should_return_the_card_limits_when_the_account_is_a_credit_card', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      name: 'Cartão',
      balanceCents: 90000,
      creditLimitCents: 500000,
      availableLimitCents: 410000,
    });
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.items[0]).toMatchObject({
      balanceCents: 90000,
      creditLimitCents: 500000,
      availableLimitCents: 410000,
    });
  });

  it('should_not_expose_the_raw_pluggy_json_when_listing', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, raw: { secret: 'valor-bruto' } });
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/accounts' });
    // Assert
    expect(response.body).not.toContain('valor-bruto');
  });

  it('should_list_the_cash_account_without_balance_or_connection_when_it_exists', async () => {
    // Arrange
    await testApp.accountsService.ensureCashAccount();
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.items).toEqual([
      expect.objectContaining({ type: 'cash', balanceCents: null, connection: null }),
    ]);
  });

  it('should_total_checking_and_savings_and_the_open_bill_when_there_is_a_card', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, name: 'Corrente', balanceCents: 300000 });
    await insertAccountWith(database.db, {
      connectionId,
      type: 'savings',
      name: 'Poupança',
      balanceCents: 185032,
    });
    await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      name: 'Cartão',
      balanceCents: 90000,
      availableLimitCents: 410000,
    });
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.totals).toEqual({
      totalBalanceCents: 485032,
      openCreditCardBillsCents: 90000,
      availableCreditCents: 410000,
    });
  });

  it('should_total_less_when_the_checking_account_is_in_overdraft', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, name: 'Corrente', balanceCents: -20000 });
    await insertAccountWith(database.db, {
      connectionId,
      type: 'savings',
      name: 'Poupança',
      balanceCents: 100000,
    });
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.totals.totalBalanceCents).toBe(80000);
  });

  it('should_keep_cash_out_of_the_total_when_the_cash_account_exists', async () => {
    // Arrange
    await seedChecking(300000);
    await testApp.accountsService.ensureCashAccount();
    // Act
    const body = await getAccounts();
    // Assert
    expect(body.totals.totalBalanceCents).toBe(300000);
  });
});

describe('PATCH /api/v1/accounts/:id', () => {
  async function seedSavings(): Promise<string> {
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, name: 'Corrente', balanceCents: 100000 });
    return insertAccountWith(database.db, {
      connectionId,
      type: 'savings',
      name: 'Poupança',
      balanceCents: 185032,
    });
  }

  it('should_leave_the_account_in_the_list_flagged_as_hidden_when_it_is_hidden', async () => {
    // Arrange
    const savingsId = await seedSavings();
    // Act
    await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${savingsId}`,
      payload: { isHidden: true },
    });
    // Assert
    const body = await getAccounts();
    expect(body.items.find((account: { id: string }) => account.id === savingsId)).toMatchObject({
      isHidden: true,
    });
  });

  it('should_reduce_the_total_when_the_savings_account_is_hidden', async () => {
    // Arrange
    const savingsId = await seedSavings();
    // Act
    await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${savingsId}`,
      payload: { isHidden: true },
    });
    // Assert
    expect((await getAccounts()).totals.totalBalanceCents).toBe(100000);
  });

  it('should_bring_the_account_back_to_the_total_when_it_is_shown_again', async () => {
    // Arrange
    const savingsId = await seedSavings();
    await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${savingsId}`,
      payload: { isHidden: true },
    });
    // Act
    await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${savingsId}`,
      payload: { isHidden: false },
    });
    // Assert
    expect((await getAccounts()).totals.totalBalanceCents).toBe(285032);
  });

  it('should_answer_400_validation_error_when_hiding_the_cash_account', async () => {
    // Arrange
    await testApp.accountsService.ensureCashAccount();
    const cashId = (await getAccounts()).items[0].id;
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${cashId}`,
      payload: { isHidden: true },
    });
    // Assert
    expect({ status: response.statusCode, code: response.json().error.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_answer_404_when_the_account_does_not_exist', async () => {
    // Arrange
    const missingId = crypto.randomUUID();
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${missingId}`,
      payload: { isHidden: true },
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });

  it('should_answer_400_when_the_body_has_no_is_hidden_flag', async () => {
    // Arrange
    const savingsId = await seedSavings();
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${savingsId}`,
      payload: {},
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});
