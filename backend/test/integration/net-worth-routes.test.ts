import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  archiveConnection,
  insertAccountSnapshot,
  insertAccountWith,
  insertConnection,
  insertInvestmentSnapshot,
  insertInvestmentWith,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const TODAY = '2026-11-15';

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

async function getNetWorth(query = '') {
  const response = await testApp.app.inject({ method: 'GET', url: `/api/v1/net-worth${query}` });
  return { statusCode: response.statusCode, body: response.json() };
}

describe('GET /api/v1/net-worth — patrimônio de hoje', () => {
  it('should_return_accounts_plus_investments_minus_open_bills_when_the_banks_are_active', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 300000 });
    await insertAccountWith(database.db, { connectionId, type: 'savings', balanceCents: 200000 });
    await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      balanceCents: 150000,
    });
    await insertInvestmentWith(database.db, connectionId, 1200000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.current).toEqual({
      date: TODAY,
      accountsCents: 500000,
      investmentsCents: 1200000,
      openBillsCents: 150000,
      netWorthCents: 1550000,
    });
  });

  it('should_leave_out_hidden_accounts_and_the_cash_account', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 100000 });
    await insertAccountWith(database.db, { connectionId, balanceCents: 999900, isHidden: true });
    await insertAccountWith(database.db, { type: 'cash', name: 'Dinheiro', balanceCents: null });
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.current.netWorthCents).toBe(100000);
  });

  it('should_leave_out_the_accounts_and_investments_of_an_archived_bank', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 300000 });
    await insertInvestmentWith(database.db, connectionId, 200000);
    await archiveConnection(database.db, connectionId, '2026-11-10T13:00:00Z');
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.current.netWorthCents).toBe(0);
  });

  it('should_return_a_negative_net_worth_when_the_bills_exceed_the_rest', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 10000 });
    await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      balanceCents: 80000,
    });
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.current.netWorthCents).toBe(-70000);
  });

  it('should_return_the_last_point_equal_to_current_when_todays_snapshots_match_the_positions', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const checkingId = await insertAccountWith(database.db, { connectionId, balanceCents: 500000 });
    const cardId = await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      balanceCents: 150000,
    });
    const investmentId = await insertInvestmentWith(database.db, connectionId, 1200000);
    await insertAccountSnapshot(database.db, checkingId, TODAY, 500000);
    await insertAccountSnapshot(database.db, cardId, TODAY, 150000);
    await insertInvestmentSnapshot(database.db, investmentId, TODAY, 1200000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.points.at(-1)).toEqual({ ...body.current, month: '2026-11' });
  });
});

describe('GET /api/v1/net-worth — pontos mensais', () => {
  it('should_use_the_previous_snapshot_of_an_item_that_has_none_on_the_reference_day', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, { connectionId });
    const investmentId = await insertInvestmentWith(database.db, connectionId, 0);
    await insertAccountSnapshot(database.db, accountId, '2026-10-30', 1000);
    await insertAccountSnapshot(database.db, accountId, '2026-10-31', 1000);
    await insertInvestmentSnapshot(database.db, investmentId, '2026-10-30', 5000);
    // Act
    const { body } = await getNetWorth('?from=2026-10&to=2026-10');
    // Assert
    expect(body.points).toEqual([
      {
        month: '2026-10',
        date: '2026-10-31',
        accountsCents: 1000,
        investmentsCents: 5000,
        openBillsCents: 0,
        netWorthCents: 6000,
      },
    ]);
  });

  it('should_not_return_a_point_for_a_month_without_snapshots', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    await insertAccountSnapshot(database.db, accountId, '2026-09-20', 1000);
    await insertAccountSnapshot(database.db, accountId, '2026-11-02', 2000);
    // Act
    const { body } = await getNetWorth('?from=2026-09');
    // Assert
    expect(body.points.map((point: { month: string }) => point.month)).toEqual([
      '2026-09',
      '2026-11',
    ]);
  });

  it('should_leave_out_the_snapshots_of_hidden_accounts', async () => {
    // Arrange
    const visibleId = await insertAccountWith(database.db);
    const hiddenId = await insertAccountWith(database.db, { isHidden: true });
    await insertAccountSnapshot(database.db, visibleId, '2026-10-31', 1000);
    await insertAccountSnapshot(database.db, hiddenId, '2026-10-31', 999900);
    // Act
    const { body } = await getNetWorth('?from=2026-10&to=2026-10');
    // Assert
    expect(body.points[0].netWorthCents).toBe(1000);
  });

  it('should_step_down_in_the_month_the_bank_was_archived_and_keep_its_past', async () => {
    // Arrange
    const activeConnectionId = await insertConnection(database.db);
    const archivedConnectionId = await insertConnection(database.db);
    const activeId = await insertAccountWith(database.db, { connectionId: activeConnectionId });
    const archivedId = await insertAccountWith(database.db, {
      connectionId: archivedConnectionId,
    });
    await insertAccountSnapshot(database.db, activeId, '2026-09-30', 1000);
    await insertAccountSnapshot(database.db, activeId, '2026-10-31', 1000);
    await insertAccountSnapshot(database.db, archivedId, '2026-09-30', 3000);
    await insertAccountSnapshot(database.db, archivedId, '2026-10-09', 3000);
    await archiveConnection(database.db, archivedConnectionId, '2026-10-10T13:00:00Z');
    // Act
    const { body } = await getNetWorth('?from=2026-09&to=2026-10');
    // Assert
    expect(body.points.map((point: { netWorthCents: number }) => point.netWorthCents)).toEqual([
      4000, 1000,
    ]);
  });

  it('should_return_no_points_and_no_first_snapshot_date_when_there_are_no_snapshots', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAccountWith(database.db, { connectionId, balanceCents: 100000 });
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect({ points: body.points, firstSnapshotDate: body.firstSnapshotDate }).toEqual({
      points: [],
      firstSnapshotDate: null,
    });
  });

  it('should_return_the_oldest_snapshot_day_among_accounts_and_investments', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, { connectionId });
    const investmentId = await insertInvestmentWith(database.db, connectionId, 1000);
    await insertAccountSnapshot(database.db, accountId, '2026-11-04', 1000);
    await insertInvestmentSnapshot(database.db, investmentId, '2026-11-02', 1000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.firstSnapshotDate).toBe('2026-11-02');
  });

  it('should_return_only_the_last_twelve_months_when_no_range_is_given', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    await insertAccountSnapshot(database.db, accountId, '2025-11-20', 1000);
    await insertAccountSnapshot(database.db, accountId, '2025-12-20', 2000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.points.map((point: { month: string }) => point.month)).toEqual(['2025-12']);
  });

  it('should_cap_to_at_the_current_month_when_it_is_in_the_future', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    await insertAccountSnapshot(database.db, accountId, '2026-11-02', 1000);
    // Act
    const { statusCode, body } = await getNetWorth('?from=2026-11&to=2027-03');
    // Assert
    expect({
      statusCode,
      months: body.points.map((point: { month: string }) => point.month),
    }).toEqual({
      statusCode: 200,
      months: ['2026-11'],
    });
  });
});

describe('GET /api/v1/net-worth — variação no mês', () => {
  it('should_return_the_change_since_the_first_snapshot_of_the_month', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, { connectionId, balanceCents: 1050000 });
    await insertAccountSnapshot(database.db, accountId, '2026-11-01', 1000000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.monthChange).toEqual({ cents: 50000, percent: 5 });
  });

  it('should_return_null_when_the_only_snapshot_of_the_month_is_from_today', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, { connectionId, balanceCents: 1000 });
    await insertAccountSnapshot(database.db, accountId, TODAY, 1000);
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.monthChange).toBeNull();
  });

  it('should_not_show_a_drop_when_a_bank_was_archived_during_the_month', async () => {
    // Arrange
    const activeConnectionId = await insertConnection(database.db);
    const archivedConnectionId = await insertConnection(database.db);
    const activeId = await insertAccountWith(database.db, {
      connectionId: activeConnectionId,
      balanceCents: 5000,
    });
    const archivedId = await insertAccountWith(database.db, {
      connectionId: archivedConnectionId,
      balanceCents: 1000,
    });
    await insertAccountSnapshot(database.db, activeId, '2026-11-01', 5000);
    await insertAccountSnapshot(database.db, archivedId, '2026-11-01', 1000);
    await archiveConnection(database.db, archivedConnectionId, '2026-11-10T13:00:00Z');
    // Act
    const { body } = await getNetWorth();
    // Assert
    expect(body.monthChange).toEqual({ cents: 0, percent: 0 });
  });

  it('should_still_return_the_current_month_change_when_the_range_ends_in_a_past_month', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const accountId = await insertAccountWith(database.db, { connectionId, balanceCents: 2000 });
    await insertAccountSnapshot(database.db, accountId, '2026-11-01', 1000);
    // Act
    const { body } = await getNetWorth('?from=2026-01&to=2026-03');
    // Assert
    expect(body.monthChange).toEqual({ cents: 1000, percent: 100 });
  });
});
