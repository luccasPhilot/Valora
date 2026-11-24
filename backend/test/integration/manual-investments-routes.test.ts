import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { goalContributions, goalLinks, goals, investmentSnapshots } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertConnection,
  insertInvestmentSnapshot,
  insertInvestmentWith,
  insertManualInvestment,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const TODAY = '2026-11-15';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const FUND_CENTS = 2_500_000;
const NEW_FUND = {
  name: 'Fundo INCO',
  institutionName: 'INCO',
  type: 'MUTUAL_FUND',
  balanceCents: FUND_CENTS,
};

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

async function send(method: 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) {
  const response = await testApp.app.inject({ method, url, payload });
  return {
    statusCode: response.statusCode,
    body: response.body === '' ? null : response.json(),
  };
}

async function snapshotsOf(investmentId: string) {
  return database.db
    .select({ date: investmentSnapshots.date, balanceCents: investmentSnapshots.balanceCents })
    .from(investmentSnapshots)
    .where(eq(investmentSnapshots.investmentId, investmentId));
}

describe('POST /api/v1/investments', () => {
  it('should_create_a_manual_position_with_todays_update_day_when_the_body_is_valid', async () => {
    // Arrange / Act
    const { statusCode, body } = await send('POST', '/api/v1/investments', NEW_FUND);
    // Assert
    expect({ statusCode, body }).toEqual({
      statusCode: 201,
      body: {
        id: expect.any(String),
        ...NEW_FUND,
        source: 'manual',
        balanceUpdatedOn: TODAY,
      },
    });
  });

  it('should_save_todays_snapshot_when_the_position_is_created', async () => {
    // Arrange / Act
    const { body } = await send('POST', '/api/v1/investments', NEW_FUND);
    // Assert
    expect(await snapshotsOf(body.id)).toEqual([{ date: TODAY, balanceCents: FUND_CENTS }]);
  });

  it('should_trim_the_name_and_the_institution_when_they_have_extra_spaces', async () => {
    // Arrange / Act
    const { body } = await send('POST', '/api/v1/investments', {
      ...NEW_FUND,
      name: '  Fundo INCO ',
      institutionName: ' INCO  ',
    });
    // Assert
    expect({ name: body.name, institutionName: body.institutionName }).toEqual({
      name: 'Fundo INCO',
      institutionName: 'INCO',
    });
  });

  it.each([0, -100])(
    'should_reject_with_balance_cents_in_details_when_the_value_is_%i',
    async (balanceCents) => {
      // Arrange / Act
      const { statusCode, body } = await send('POST', '/api/v1/investments', {
        ...NEW_FUND,
        balanceCents,
      });
      // Assert
      expect({ statusCode, code: body.error.code, field: body.error.details[0].field }).toEqual({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        field: 'balanceCents',
      });
    },
  );

  it('should_reject_with_balance_cents_in_details_when_the_value_has_decimals', async () => {
    // Arrange / Act
    const { statusCode, body } = await send('POST', '/api/v1/investments', {
      ...NEW_FUND,
      balanceCents: 10.5,
    });
    // Assert
    expect({ statusCode, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      field: 'balanceCents',
    });
  });

  it('should_reject_with_type_in_details_when_the_type_is_unknown', async () => {
    // Arrange / Act
    const { statusCode, body } = await send('POST', '/api/v1/investments', {
      ...NEW_FUND,
      type: 'STOCKS',
    });
    // Assert
    expect({ statusCode, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      field: 'type',
    });
  });

  it('should_reject_with_institution_name_in_details_when_the_institution_is_empty', async () => {
    // Arrange / Act
    const { statusCode, body } = await send('POST', '/api/v1/investments', {
      ...NEW_FUND,
      institutionName: '   ',
    });
    // Assert
    expect({ statusCode, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      field: 'institutionName',
    });
  });

  it('should_not_save_anything_when_the_body_is_invalid', async () => {
    // Arrange
    await send('POST', '/api/v1/investments', { ...NEW_FUND, balanceCents: 0 });
    // Act
    const stored = await database.db.query.investments.findMany();
    // Assert
    expect(stored).toEqual([]);
  });
});

describe('PATCH /api/v1/investments/:id', () => {
  it('should_update_the_value_the_update_day_and_todays_snapshot_when_the_value_is_sent', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db, { balanceUpdatedOn: '2026-11-01' });
    // Act
    const { statusCode, body } = await send('PATCH', `/api/v1/investments/${id}`, {
      balanceCents: 2_600_000,
    });
    // Assert
    expect({ statusCode, body, snapshots: await snapshotsOf(id) }).toEqual({
      statusCode: 200,
      body: expect.objectContaining({ balanceCents: 2_600_000, balanceUpdatedOn: TODAY }),
      snapshots: [{ date: TODAY, balanceCents: 2_600_000 }],
    });
  });

  it('should_keep_a_single_snapshot_with_the_last_value_when_the_value_is_updated_twice_today', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    await send('PATCH', `/api/v1/investments/${id}`, { balanceCents: 2_600_000 });
    // Act
    await send('PATCH', `/api/v1/investments/${id}`, { balanceCents: 2_700_000 });
    // Assert
    expect(await snapshotsOf(id)).toEqual([{ date: TODAY, balanceCents: 2_700_000 }]);
  });

  it('should_keep_the_update_day_and_the_snapshots_when_only_the_name_changes', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db, { balanceUpdatedOn: '2026-11-10' });
    await insertInvestmentSnapshot(database.db, id, '2026-11-10', FUND_CENTS);
    // Act
    const { body } = await send('PATCH', `/api/v1/investments/${id}`, { name: 'INCO Renda' });
    // Assert
    expect({
      name: body.name,
      day: body.balanceUpdatedOn,
      snapshots: await snapshotsOf(id),
    }).toEqual({
      name: 'INCO Renda',
      day: '2026-11-10',
      snapshots: [{ date: '2026-11-10', balanceCents: FUND_CENTS }],
    });
  });

  it('should_close_the_position_with_a_zero_snapshot_when_the_value_is_zero', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    // Act
    await send('PATCH', `/api/v1/investments/${id}`, { balanceCents: 0 });
    const { body } = await send('PATCH', `/api/v1/investments/${id}`, { balanceCents: 0 });
    const list = await testApp.app.inject({ method: 'GET', url: '/api/v1/investments' });
    // Assert
    expect({
      closed: list.json().totals.closedCount,
      snapshots: await snapshotsOf(id),
      body: body.balanceCents,
    }).toEqual({ closed: 1, snapshots: [{ date: TODAY, balanceCents: 0 }], body: 0 });
  });

  it('should_reopen_the_position_when_a_closed_one_gets_a_positive_value', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db, { balanceCents: 0 });
    // Act
    await send('PATCH', `/api/v1/investments/${id}`, { balanceCents: 100_000 });
    const list = await testApp.app.inject({ method: 'GET', url: '/api/v1/investments' });
    // Assert
    expect(list.json().totals).toEqual({ totalCents: 100_000, positionsCount: 1, closedCount: 0 });
  });

  it('should_reject_with_a_validation_error_when_the_value_is_negative', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    // Act
    const { statusCode, body } = await send('PATCH', `/api/v1/investments/${id}`, {
      balanceCents: -1,
    });
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_reject_with_a_validation_error_when_the_body_is_empty', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    // Act
    const { statusCode } = await send('PATCH', `/api/v1/investments/${id}`, {});
    // Assert
    expect(statusCode).toBe(400);
  });

  it('should_answer_409_open_finance_read_only_when_the_investment_comes_from_pluggy', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const id = await insertInvestmentWith(database.db, connectionId, 100_000);
    // Act
    const { statusCode, body } = await send('PATCH', `/api/v1/investments/${id}`, {
      balanceCents: 1,
    });
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({
      statusCode: 409,
      code: 'OPEN_FINANCE_READ_ONLY',
    });
  });

  it('should_answer_404_with_the_id_in_the_message_when_the_investment_does_not_exist', async () => {
    // Arrange / Act
    const { statusCode, body } = await send('PATCH', `/api/v1/investments/${UNKNOWN_ID}`, {
      balanceCents: 1,
    });
    // Assert
    expect({
      statusCode,
      code: body.error.code,
      hasId: body.error.message.includes(UNKNOWN_ID),
    }).toEqual({ statusCode: 404, code: 'NOT_FOUND', hasId: true });
  });
});

describe('DELETE /api/v1/investments/:id', () => {
  it('should_delete_the_position_and_its_snapshots_when_it_is_manual', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    await insertInvestmentSnapshot(database.db, id, '2026-11-10', FUND_CENTS);
    // Act
    const { statusCode } = await send('DELETE', `/api/v1/investments/${id}`);
    // Assert
    expect({
      statusCode,
      positions: await database.db.query.investments.findMany(),
      snapshots: await snapshotsOf(id),
    }).toEqual({ statusCode: 204, positions: [], snapshots: [] });
  });

  it('should_remove_the_goal_link_but_keep_the_goal_and_its_contributions_when_the_position_is_deleted', async () => {
    // Arrange
    const id = await insertManualInvestment(database.db);
    const [goal] = await database.db
      .insert(goals)
      .values({ name: 'Reserva', icon: 'piggy-bank', targetCents: 5_000_000, savedCents: 1_000 })
      .returning({ id: goals.id });
    if (!goal) throw new Error('Teste: meta não foi criada');
    await database.db.insert(goalContributions).values({
      goalId: goal.id,
      kind: 'initial',
      amountCents: 1_000,
      date: '2026-11-01',
    });
    await database.db.insert(goalLinks).values({ goalId: goal.id, investmentId: id });
    // Act
    await send('DELETE', `/api/v1/investments/${id}`);
    // Assert
    expect({
      links: await database.db.select().from(goalLinks),
      goals: (await database.db.select().from(goals)).length,
      contributions: (await database.db.select().from(goalContributions)).length,
    }).toEqual({ links: [], goals: 1, contributions: 1 });
  });

  it('should_answer_409_and_keep_the_investment_when_it_comes_from_pluggy', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const id = await insertInvestmentWith(database.db, connectionId, 100_000);
    // Act
    const { statusCode, body } = await send('DELETE', `/api/v1/investments/${id}`);
    // Assert
    expect({
      statusCode,
      code: body.error.code,
      stored: (await database.db.query.investments.findMany()).length,
    }).toEqual({ statusCode: 409, code: 'OPEN_FINANCE_READ_ONLY', stored: 1 });
  });

  it('should_answer_404_when_the_investment_does_not_exist', async () => {
    // Arrange / Act
    const { statusCode } = await send('DELETE', `/api/v1/investments/${UNKNOWN_ID}`);
    // Assert
    expect(statusCode).toBe(404);
  });
});
