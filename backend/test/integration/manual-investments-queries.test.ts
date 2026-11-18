import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  archiveConnection,
  insertConnection,
  insertInvestmentSnapshot,
  insertInvestmentWith,
  insertManualInvestment,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const TODAY = '2026-11-15';
const FUND_CENTS = 2_500_000;

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

async function get(url: string) {
  const response = await testApp.app.inject({ method: 'GET', url });
  return { statusCode: response.statusCode, body: response.json() };
}

async function createLinkedGoal(investmentId: string) {
  const response = await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/goals',
    payload: {
      name: 'Reserva',
      icon: 'piggy-bank',
      targetCents: 5_000_000,
      links: [{ type: 'investment', id: investmentId }],
    },
  });
  return { statusCode: response.statusCode, body: response.json() };
}

describe('GET /api/v1/investments — posições manuais', () => {
  it('should_group_a_manual_position_with_the_open_finance_ones_when_they_share_a_type', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { institutionName: 'Banco A' });
    await insertInvestmentWith(database.db, connectionId, 100_000);
    await insertManualInvestment(database.db, { type: 'FIXED_INCOME', balanceCents: 50_000 });
    // Act
    const { body } = await get('/api/v1/investments');
    // Assert
    expect(body.groups[0].items.map((item: { source: string }) => item.source)).toEqual([
      'open_finance',
      'manual',
    ]);
  });

  it('should_return_the_typed_institution_and_the_update_day_when_the_position_is_manual', async () => {
    // Arrange
    await insertManualInvestment(database.db);
    // Act
    const { body } = await get('/api/v1/investments');
    // Assert
    expect(body.groups[0].items[0]).toMatchObject({
      source: 'manual',
      institutionName: 'INCO',
      subtype: null,
      balanceUpdatedOn: '2026-11-10',
    });
  });

  it('should_return_a_null_update_day_when_the_position_comes_from_open_finance', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertInvestmentWith(database.db, connectionId, 100_000);
    // Act
    const { body } = await get('/api/v1/investments');
    // Assert
    expect(body.groups[0].items[0]).toMatchObject({
      source: 'open_finance',
      balanceUpdatedOn: null,
    });
  });

  it('should_keep_the_manual_position_in_the_total_when_a_bank_is_archived', async () => {
    // Arrange
    const archivedId = await insertConnection(database.db, { archivedAt: new Date() });
    await insertInvestmentWith(database.db, archivedId, 200_000);
    await insertManualInvestment(database.db, { balanceCents: 300_000 });
    // Act
    const { body } = await get('/api/v1/investments');
    // Assert
    expect(body.totals.totalCents).toBe(300_000);
  });

  it('should_count_a_closed_manual_position_in_closed_count_when_its_balance_is_zero', async () => {
    // Arrange
    await insertManualInvestment(database.db, { balanceCents: 0 });
    // Act
    const { body } = await get('/api/v1/investments');
    // Assert
    expect(body.totals).toEqual({ totalCents: 0, positionsCount: 0, closedCount: 1 });
  });
});

describe('GET /api/v1/net-worth — posições manuais', () => {
  it('should_add_the_manual_position_to_the_investments_of_today', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertInvestmentWith(database.db, connectionId, 1_200_000);
    await insertManualInvestment(database.db, { balanceCents: FUND_CENTS });
    // Act
    const { body } = await get('/api/v1/net-worth');
    // Assert
    expect(body.current).toMatchObject({ date: TODAY, investmentsCents: 3_700_000 });
  });

  it('should_keep_the_manual_position_in_the_net_worth_when_a_bank_is_archived', async () => {
    // Arrange
    const archivedId = await insertConnection(database.db, { archivedAt: new Date() });
    await insertInvestmentWith(database.db, archivedId, 200_000);
    await insertManualInvestment(database.db, { balanceCents: FUND_CENTS });
    // Act
    const { body } = await get('/api/v1/net-worth');
    // Assert
    expect(body.current.investmentsCents).toBe(FUND_CENTS);
  });

  it('should_use_the_manual_snapshot_on_the_reference_day_of_a_past_month', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(database.db);
    await insertInvestmentSnapshot(database.db, investmentId, '2026-10-31', FUND_CENTS);
    // Act
    const { body } = await get('/api/v1/net-worth?from=2026-10&to=2026-10');
    // Assert
    expect(body.points[0]).toMatchObject({
      investmentsCents: FUND_CENTS,
      netWorthCents: FUND_CENTS,
    });
  });

  it('should_count_the_manual_snapshot_after_a_bank_was_archived', async () => {
    // Arrange
    const archivedId = await insertConnection(database.db);
    await insertInvestmentWith(database.db, archivedId, 0);
    await archiveConnection(database.db, archivedId, '2026-10-10T13:00:00Z');
    const investmentId = await insertManualInvestment(database.db);
    await insertInvestmentSnapshot(database.db, investmentId, '2026-10-31', FUND_CENTS);
    // Act
    const { body } = await get('/api/v1/net-worth?from=2026-10&to=2026-10');
    // Assert
    expect(body.points[0].investmentsCents).toBe(FUND_CENTS);
  });
});

describe('metas vinculadas — posições manuais', () => {
  it('should_use_the_manual_balance_and_the_typed_institution_when_the_goal_is_linked_to_it', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(database.db, { balanceCents: FUND_CENTS });
    // Act
    const { statusCode, body } = await createLinkedGoal(investmentId);
    // Assert
    expect({ statusCode, savedCents: body.savedCents, links: body.links }).toEqual({
      statusCode: 201,
      savedCents: FUND_CENTS,
      links: [
        {
          type: 'investment',
          id: investmentId,
          name: 'Fundo INCO',
          institutionName: 'INCO',
          balanceCents: FUND_CENTS,
          isArchived: false,
        },
      ],
    });
  });

  it('should_keep_counting_the_manual_position_when_the_other_linked_bank_is_archived', async () => {
    // Arrange
    const manualId = await insertManualInvestment(database.db, { balanceCents: FUND_CENTS });
    const { body: goal } = await createLinkedGoal(manualId);
    const connectionId = await insertConnection(database.db);
    const bankInvestmentId = await insertInvestmentWith(database.db, connectionId, 100_000);
    await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/goals/${goal.id}`,
      payload: {
        name: 'Reserva',
        icon: 'piggy-bank',
        targetCents: 5_000_000,
        links: [
          { type: 'investment', id: manualId },
          { type: 'investment', id: bankInvestmentId },
        ],
      },
    });
    await archiveConnection(database.db, connectionId, '2026-11-01T13:00:00Z');
    // Act
    const { body } = await get('/api/v1/goals');
    // Assert
    expect(body.items[0].savedCents).toBe(FUND_CENTS);
  });
});
