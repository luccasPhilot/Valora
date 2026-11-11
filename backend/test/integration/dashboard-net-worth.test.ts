import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertAccountSnapshot,
  insertAccountWith,
  insertConnection,
  insertInvestmentWith,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const CURRENT_MONTH = '2026-11';
const PAST_MONTH = '2026-10';
const TODAY = '2026-11-15';
const FIRST_DAY_OF_MONTH = '2026-11-01';

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

async function getJson(url: string) {
  const response = await testApp.app.inject({ method: 'GET', url });
  return response.json();
}

async function insertPositions(): Promise<{ checkingId: string; investmentId: string }> {
  const connectionId = await insertConnection(database.db);
  const checkingId = await insertAccountWith(database.db, { connectionId, balanceCents: 500_000 });
  await insertAccountWith(database.db, {
    connectionId,
    type: 'credit_card',
    balanceCents: 150_000,
  });
  const investmentId = await insertInvestmentWith(database.db, connectionId, 1_200_000);
  return { checkingId, investmentId };
}

describe('GET /api/v1/dashboard — patrimônio', () => {
  it('should_return_the_same_numbers_as_the_net_worth_endpoint_when_there_are_investments_and_a_bill', async () => {
    // Arrange
    const { checkingId } = await insertPositions();
    await insertAccountSnapshot(database.db, checkingId, FIRST_DAY_OF_MONTH, 450_000);
    // Act
    const dashboard = await getJson(`/api/v1/dashboard?month=${CURRENT_MONTH}`);
    const netWorth = await getJson('/api/v1/net-worth');
    // Assert
    expect(dashboard.netWorth).toEqual({
      totalCents: netWorth.current.netWorthCents,
      investmentsCents: netWorth.current.investmentsCents,
      openBillsCents: netWorth.current.openBillsCents,
      change: netWorth.monthChange,
    });
  });

  it('should_return_the_total_as_accounts_plus_investments_minus_the_open_bill', async () => {
    // Arrange
    await insertPositions();
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.netWorth).toMatchObject({
      totalCents: 1_550_000,
      investmentsCents: 1_200_000,
      openBillsCents: 150_000,
    });
  });

  it('should_return_zero_investments_and_bills_when_there_are_only_accounts', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 500_000 });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.netWorth).toEqual({
      totalCents: 500_000,
      investmentsCents: 0,
      openBillsCents: 0,
      change: null,
    });
  });

  it('should_keep_the_total_balance_as_checking_and_savings_only_when_there_are_investments', async () => {
    // Arrange
    await insertPositions();
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.totalBalanceCents).toBe(500_000);
  });

  it('should_return_null_net_worth_when_the_month_is_in_the_past', async () => {
    // Arrange
    await insertPositions();
    // Act
    const dashboard = await getJson(`/api/v1/dashboard?month=${PAST_MONTH}`);
    // Assert
    expect(dashboard.netWorth).toBeNull();
  });

  it('should_return_a_null_change_and_keep_the_total_when_the_only_snapshot_is_from_today', async () => {
    // Arrange
    const { checkingId } = await insertPositions();
    await insertAccountSnapshot(database.db, checkingId, TODAY, 500_000);
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.netWorth).toMatchObject({ totalCents: 1_550_000, change: null });
  });

  it('should_return_the_change_since_the_first_snapshot_of_the_month', async () => {
    // Arrange
    const { checkingId } = await insertPositions();
    await insertAccountSnapshot(database.db, checkingId, FIRST_DAY_OF_MONTH, 450_000);
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.netWorth.change).toEqual({ cents: 1_100_000, percent: 244.44 });
  });
});
