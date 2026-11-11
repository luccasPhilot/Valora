import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { investments } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertConnection } from './fixtures.js';
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

async function getInvestments() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/investments' });
  return { status: response.statusCode, body: response.json() };
}

async function insertInvestment(
  connectionId: string,
  overrides: Partial<typeof investments.$inferInsert> = {},
): Promise<void> {
  await database.db.insert(investments).values({
    connectionId,
    pluggyInvestmentId: `inv-${crypto.randomUUID()}`,
    name: 'CDB teste',
    type: 'FIXED_INCOME',
    subtype: 'CDB',
    balanceCents: 100000,
    raw: { secret: 'não pode sair' },
    ...overrides,
  });
}

describe('GET /api/v1/investments', () => {
  it('should_group_positions_by_type_with_totals_when_banks_are_active', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { institutionName: 'Banco A' });
    await insertInvestment(connectionId, { name: 'CDB', balanceCents: 100000 });
    await insertInvestment(connectionId, {
      name: 'Tesouro',
      subtype: 'TREASURY',
      balanceCents: 50000,
    });
    await insertInvestment(connectionId, {
      name: 'Fundo',
      type: 'MUTUAL_FUND',
      subtype: null,
      balanceCents: 50000,
    });
    // Act
    const { body } = await getInvestments();
    // Assert
    expect({
      totals: body.totals,
      groups: body.groups.map((group: { type: string; totalCents: number; percent: number }) => [
        group.type,
        group.totalCents,
        group.percent,
      ]),
    }).toEqual({
      totals: { totalCents: 200000, positionsCount: 3, closedCount: 0 },
      groups: [
        ['FIXED_INCOME', 150000, 75],
        ['MUTUAL_FUND', 50000, 25],
      ],
    });
  });

  it('should_leave_archived_banks_out_of_the_list_and_the_total_when_a_bank_is_archived', async () => {
    // Arrange
    const active = await insertConnection(database.db);
    const archived = await insertConnection(database.db, { archivedAt: new Date() });
    await insertInvestment(active, { balanceCents: 100000 });
    await insertInvestment(archived, { balanceCents: 900000 });
    // Act
    const { body } = await getInvestments();
    // Assert
    expect(body.totals).toEqual({ totalCents: 100000, positionsCount: 1, closedCount: 0 });
  });

  it('should_count_zero_positions_as_closed_when_a_cdb_was_redeemed', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertInvestment(connectionId, { balanceCents: 100000 });
    await insertInvestment(connectionId, { balanceCents: 0 });
    await insertInvestment(connectionId, { balanceCents: 0 });
    // Act
    const { body } = await getInvestments();
    // Assert
    expect(body.totals).toEqual({ totalCents: 100000, positionsCount: 1, closedCount: 2 });
  });

  it('should_order_groups_and_items_by_size_when_there_are_several', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertInvestment(connectionId, { name: 'Pequeno', balanceCents: 1000 });
    await insertInvestment(connectionId, { name: 'Grande', balanceCents: 9000 });
    await insertInvestment(connectionId, { name: 'Ação', type: 'EQUITY', balanceCents: 5000 });
    // Act
    const { body } = await getInvestments();
    // Assert
    expect(
      body.groups.map((group: { type: string; items: { name: string }[] }) => [
        group.type,
        group.items.map(({ name }) => name),
      ]),
    ).toEqual([
      ['FIXED_INCOME', ['Grande', 'Pequeno']],
      ['EQUITY', ['Ação']],
    ]);
  });

  it('should_return_zero_totals_and_no_groups_when_there_are_no_investments', async () => {
    // Arrange: banco vazio
    // Act
    const { status, body } = await getInvestments();
    // Assert
    expect({ status, body }).toEqual({
      status: 200,
      body: { totals: { totalCents: 0, positionsCount: 0, closedCount: 0 }, groups: [] },
    });
  });

  it('should_expose_only_dto_fields_when_the_row_has_raw_and_pluggy_id', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { institutionName: 'Banco A' });
    await insertInvestment(connectionId, { name: 'CDB', balanceCents: 100000 });
    // Act
    const { body } = await getInvestments();
    // Assert
    expect(Object.keys(body.groups[0].items[0]).sort()).toEqual([
      'balanceCents',
      'id',
      'institutionName',
      'name',
      'percent',
      'subtype',
    ]);
  });
});
