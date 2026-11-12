import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, goalContributions, goals, investments } from '../../src/db/schema.js';
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
const NINETY_DAYS_AGO = '2026-08-17';
const MAX_LINKS = 10;

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

interface LinkRef {
  type: 'account' | 'investment';
  id: string;
}

async function insertInvestment(balanceCents: number, connectionId?: string): Promise<string> {
  const connection = connectionId ?? (await insertConnection(database.db));
  return insertInvestmentWith(database.db, connection, balanceCents);
}

async function insertSavings(balanceCents: number, connectionId?: string): Promise<string> {
  const connection = connectionId ?? (await insertConnection(database.db));
  return insertAccountWith(database.db, {
    connectionId: connection,
    type: 'savings',
    name: 'Poupança',
    balanceCents,
  });
}

async function post(url: string, payload: unknown) {
  const response = await testApp.app.inject({ method: 'POST', url, payload: payload as object });
  return { statusCode: response.statusCode, body: response.json() };
}

async function createGoal(overrides: Record<string, unknown> = {}) {
  return post('/api/v1/goals', {
    name: 'Reserva',
    icon: 'piggy-bank',
    targetCents: 2_000_000,
    ...overrides,
  });
}

async function updateGoal(goalId: string, overrides: Record<string, unknown> = {}) {
  const response = await testApp.app.inject({
    method: 'PUT',
    url: `/api/v1/goals/${goalId}`,
    payload: { name: 'Reserva', icon: 'piggy-bank', targetCents: 2_000_000, ...overrides },
  });
  return { statusCode: response.statusCode, body: response.json() };
}

async function listGoals() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/goals' });
  return response.json().items;
}

async function createLinkedGoal(links: LinkRef[], overrides: Record<string, unknown> = {}) {
  const { statusCode, body } = await createGoal({ links, ...overrides });
  if (statusCode !== 201) throw new Error(`Teste: meta vinculada não foi criada (${statusCode})`);
  return body;
}

describe('POST /api/v1/goals — vínculos', () => {
  it('should_sum_the_balances_when_the_goal_is_linked_to_an_investment_and_a_savings_account', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const accountId = await insertSavings(250_000);
    // Act
    const { statusCode, body } = await createGoal({
      links: [
        { type: 'investment', id: investmentId },
        { type: 'account', id: accountId },
      ],
    });
    // Assert
    expect(statusCode).toBe(201);
    expect(body).toMatchObject({ isLinked: true, savedCents: 1_250_000, progressPercent: 62 });
  });

  it('should_list_each_link_with_name_institution_and_balance_without_pluggy_ids', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { institutionName: 'Banco Azul' });
    const investmentId = await insertInvestment(1_000_000, connectionId);
    // Act
    const { body } = await createGoal({ links: [{ type: 'investment', id: investmentId }] });
    // Assert
    expect(body.links).toEqual([
      {
        type: 'investment',
        id: investmentId,
        name: 'CDB teste',
        institutionName: 'Banco Azul',
        balanceCents: 1_000_000,
        isArchived: false,
      },
    ]);
  });

  it('should_not_be_linked_when_no_links_are_sent', async () => {
    // Arrange
    const payload = { initialCents: 150_000 };
    // Act
    const { body } = await createGoal(payload);
    // Assert
    expect(body).toMatchObject({
      isLinked: false,
      links: [],
      savedCents: 150_000,
      manualSavedCents: 150_000,
    });
  });

  it('should_reject_with_initial_cents_in_details_when_links_come_with_an_initial_value', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    // Act
    const { statusCode, body } = await createGoal({
      links: [{ type: 'investment', id: investmentId }],
      initialCents: 100_000,
    });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'initialCents' }],
    });
  });

  it('should_reject_with_links_in_details_when_the_account_is_a_credit_card', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const cardId = await insertAccountWith(database.db, {
      connectionId,
      type: 'credit_card',
      name: 'Cartão',
    });
    // Act
    const { statusCode, body } = await createGoal({ links: [{ type: 'account', id: cardId }] });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'links' }],
    });
  });

  it('should_reject_with_links_in_details_when_the_account_is_the_cash_account', async () => {
    // Arrange
    const cashId = await insertAccountWith(database.db, { type: 'cash', name: 'Dinheiro' });
    // Act
    const { statusCode, body } = await createGoal({ links: [{ type: 'account', id: cashId }] });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'links' })]);
  });

  it('should_reject_with_links_in_details_when_the_item_does_not_exist', async () => {
    // Arrange
    const unknownId = '00000000-0000-4000-8000-000000000000';
    // Act
    const { statusCode, body } = await createGoal({
      links: [{ type: 'investment', id: unknownId }],
    });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'links' })]);
  });

  it('should_reject_with_links_in_details_when_the_item_belongs_to_an_archived_bank', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const investmentId = await insertInvestment(1_000_000, connectionId);
    await archiveConnection(database.db, connectionId, '2026-11-01T12:00:00Z');
    // Act
    const { statusCode, body } = await createGoal({
      links: [{ type: 'investment', id: investmentId }],
    });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'links' })]);
  });

  it('should_reject_with_links_in_details_when_the_same_item_is_sent_twice', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const link: LinkRef = { type: 'investment', id: investmentId };
    // Act
    const { statusCode, body } = await createGoal({ links: [link, link] });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'links' })]);
  });

  it('should_reject_with_links_in_details_when_there_are_more_than_ten_items', async () => {
    // Arrange
    const links = Array.from({ length: MAX_LINKS + 1 }, () => ({
      type: 'investment',
      id: crypto.randomUUID(),
    }));
    // Act
    const { statusCode, body } = await createGoal({ links });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'links' })]);
  });

  it('should_accept_ten_items_when_they_are_all_valid', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    const links: LinkRef[] = [];
    for (let position = 0; position < MAX_LINKS; position += 1) {
      links.push({ type: 'investment', id: await insertInvestment(100_000, connectionId) });
    }
    // Act
    const { statusCode, body } = await createGoal({ links });
    // Assert
    expect(statusCode).toBe(201);
    expect(body.savedCents).toBe(1_000_000);
  });

  it('should_not_create_the_goal_when_a_link_is_invalid', async () => {
    // Arrange
    const unknownId = '00000000-0000-4000-8000-000000000000';
    // Act
    await createGoal({ links: [{ type: 'investment', id: unknownId }] });
    // Assert
    expect(await database.db.select().from(goals)).toEqual([]);
  });
});

describe('GET /api/v1/goals — valor acumulado de meta vinculada', () => {
  it('should_follow_the_balance_when_the_synchronization_changes_it', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    await database.db
      .update(investments)
      .set({ balanceCents: 1_030_000 })
      .where(eq(investments.id, investmentId));
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal.savedCents).toBe(1_030_000);
  });

  it('should_keep_an_item_of_an_archived_bank_listed_and_count_zero_for_it', async () => {
    // Arrange
    const archivedConnectionId = await insertConnection(database.db);
    const archivedId = await insertInvestment(1_000_000, archivedConnectionId);
    const activeId = await insertSavings(250_000);
    await createLinkedGoal([
      { type: 'investment', id: archivedId },
      { type: 'account', id: activeId },
    ]);
    await archiveConnection(database.db, archivedConnectionId, '2026-11-10T12:00:00Z');
    // Act
    const [goal] = await listGoals();
    // Assert
    expect({
      savedCents: goal.savedCents,
      archivedFlags: goal.links.map((link: { isArchived: boolean }) => link.isArchived).sort(),
    }).toEqual({ savedCents: 250_000, archivedFlags: [false, true] });
  });

  it('should_return_zero_when_the_only_linked_account_is_overdrawn', async () => {
    // Arrange
    const accountId = await insertSavings(-20_000);
    await createLinkedGoal([{ type: 'account', id: accountId }]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal.savedCents).toBe(0);
  });

  it('should_use_the_calculated_value_for_the_status_when_the_balance_reaches_the_target', async () => {
    // Arrange
    const investmentId = await insertInvestment(2_500_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal).toMatchObject({ status: 'completed', remainingCents: 0, progressPercent: 100 });
  });

  it('should_sort_a_completed_linked_goal_after_the_active_ones', async () => {
    // Arrange
    const investmentId = await insertInvestment(2_500_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }], {
      name: 'Aaa concluída',
      targetDate: '2026-12-01',
    });
    await createGoal({ name: 'Zzz ativa', targetDate: '2027-12-01' });
    // Act
    const goalsList = await listGoals();
    // Assert
    expect(goalsList.map((goal: { name: string }) => goal.name)).toEqual([
      'Zzz ativa',
      'Aaa concluída',
    ]);
  });

  it('should_show_the_calculated_value_in_the_dashboard', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/dashboard' });
    // Assert
    expect(response.json().goals.items[0]).toMatchObject({ savedCents: 1_000_000, percent: 50 });
  });
});

describe('PUT /api/v1/goals/:id — vínculos', () => {
  it('should_keep_the_links_when_the_request_does_not_send_links', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const { body } = await updateGoal(goal.id, { name: 'Outro nome' });
    // Assert
    expect(body).toMatchObject({ name: 'Outro nome', isLinked: true, savedCents: 1_000_000 });
  });

  it('should_replace_the_whole_set_when_a_list_of_links_is_sent', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const accountId = await insertSavings(250_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const { body } = await updateGoal(goal.id, { links: [{ type: 'account', id: accountId }] });
    // Assert
    expect(body.links).toEqual([expect.objectContaining({ type: 'account', id: accountId })]);
  });

  it('should_go_back_to_the_manual_value_when_the_links_are_cleared', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const { body } = await updateGoal(goal.id, { links: [] });
    // Assert
    expect(body).toMatchObject({ isLinked: false, links: [], savedCents: 0 });
  });

  it('should_keep_the_old_contributions_and_count_the_balance_when_a_manual_goal_gets_linked', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const { body: goal } = await createGoal({ initialCents: 150_000 });
    // Act
    const { body } = await updateGoal(goal.id, {
      links: [{ type: 'investment', id: investmentId }],
    });
    // Assert
    const contributions = await database.db
      .select({ amountCents: goalContributions.amountCents })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goal.id));
    expect({
      savedCents: body.savedCents,
      manualSavedCents: body.manualSavedCents,
      contributions,
    }).toEqual({
      savedCents: 1_000_000,
      manualSavedCents: 150_000,
      contributions: [{ amountCents: 150_000 }],
    });
  });

  it('should_count_the_old_contributions_again_when_the_goal_is_unlinked', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const { body: goal } = await createGoal({ initialCents: 150_000 });
    await updateGoal(goal.id, { links: [{ type: 'investment', id: investmentId }] });
    // Act
    const { body } = await updateGoal(goal.id, { links: [] });
    // Assert
    expect(body).toMatchObject({ isLinked: false, savedCents: 150_000 });
  });

  it('should_not_change_the_stored_saved_cents_while_the_goal_is_linked', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const { body: goal } = await createGoal({ initialCents: 150_000 });
    // Act
    await updateGoal(goal.id, { links: [{ type: 'investment', id: investmentId }] });
    // Assert
    const [row] = await database.db
      .select({ savedCents: goals.savedCents })
      .from(goals)
      .where(eq(goals.id, goal.id));
    expect(row?.savedCents).toBe(150_000);
  });

  it('should_keep_the_previous_links_when_the_new_list_is_invalid', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    const cashId = await insertAccountWith(database.db, { type: 'cash', name: 'Dinheiro' });
    // Act
    const { statusCode } = await updateGoal(goal.id, { links: [{ type: 'account', id: cashId }] });
    // Assert
    const [after] = await listGoals();
    expect({ statusCode, linkCount: after.links.length }).toEqual({
      statusCode: 400,
      linkCount: 1,
    });
  });

  it('should_delete_the_links_but_keep_the_items_when_the_goal_is_deleted', async () => {
    // Arrange
    const accountId = await insertSavings(250_000);
    const goal = await createLinkedGoal([{ type: 'account', id: accountId }]);
    // Act
    await testApp.app.inject({ method: 'DELETE', url: `/api/v1/goals/${goal.id}` });
    // Assert
    const stored = await database.db.select({ id: accounts.id }).from(accounts);
    expect(stored).toEqual([{ id: accountId }]);
  });
});

describe('aportes em meta vinculada', () => {
  it('should_refuse_a_contribution_with_goal_is_linked_when_the_goal_has_links', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const { statusCode, body } = await post(`/api/v1/goals/${goal.id}/contributions`, {
      type: 'deposit',
      amountCents: 50_000,
      date: '2026-11-15',
    });
    // Assert
    expect(statusCode).toBe(409);
    expect(body.error.code).toBe('GOAL_IS_LINKED');
  });

  it('should_not_create_the_contribution_when_the_goal_is_linked', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const goal = await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    await post(`/api/v1/goals/${goal.id}/contributions`, {
      type: 'deposit',
      amountCents: 50_000,
      date: '2026-11-15',
    });
    // Assert
    expect(await database.db.select().from(goalContributions)).toEqual([]);
  });

  it('should_refuse_removing_an_old_contribution_when_the_goal_is_linked_now', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const { body: goal } = await createGoal({ initialCents: 150_000 });
    await updateGoal(goal.id, { links: [{ type: 'investment', id: investmentId }] });
    const [contribution] = await database.db.select().from(goalContributions);
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/goals/${goal.id}/contributions/${contribution?.id}`,
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'GOAL_IS_LINKED',
    });
  });

  it('should_keep_listing_the_old_contributions_when_the_goal_is_linked', async () => {
    // Arrange
    const investmentId = await insertInvestment(1_000_000);
    const { body: goal } = await createGoal({ initialCents: 150_000 });
    await updateGoal(goal.id, { links: [{ type: 'investment', id: investmentId }] });
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/api/v1/goals/${goal.id}/contributions`,
    });
    // Assert
    expect(response.json().items).toEqual([expect.objectContaining({ amountCents: 150_000 })]);
  });
});

describe('ritmo da meta vinculada', () => {
  it('should_use_the_variation_of_the_snapshots_when_the_history_is_ninety_days_long', async () => {
    // Arrange
    const investmentId = await insertInvestment(990_000);
    await insertInvestmentSnapshot(database.db, investmentId, NINETY_DAYS_AGO, 900_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal.monthlyRateCents).toBe(30_000);
  });

  it('should_sum_the_variation_of_an_account_and_an_investment', async () => {
    // Arrange
    const investmentId = await insertInvestment(990_000);
    const accountId = await insertSavings(260_000);
    await insertInvestmentSnapshot(database.db, investmentId, NINETY_DAYS_AGO, 900_000);
    await insertAccountSnapshot(database.db, accountId, NINETY_DAYS_AGO, 200_000);
    await createLinkedGoal([
      { type: 'investment', id: investmentId },
      { type: 'account', id: accountId },
    ]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal.monthlyRateCents).toBe(50_000);
  });

  it('should_have_no_pace_when_the_only_snapshot_is_from_today', async () => {
    // Arrange
    const investmentId = await insertInvestment(990_000);
    await insertInvestmentSnapshot(database.db, investmentId, '2026-11-15', 990_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal).toMatchObject({ monthlyRateCents: 0, status: 'no_pace' });
  });

  it('should_have_no_pace_when_the_balance_dropped_since_the_first_snapshot', async () => {
    // Arrange
    const investmentId = await insertInvestment(800_000);
    await insertInvestmentSnapshot(database.db, investmentId, NINETY_DAYS_AGO, 900_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }]);
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal).toMatchObject({ monthlyRateCents: 0, status: 'no_pace' });
  });

  it('should_estimate_the_date_with_the_shared_rule_when_there_is_pace', async () => {
    // Arrange
    const investmentId = await insertInvestment(990_000);
    await insertInvestmentSnapshot(database.db, investmentId, NINETY_DAYS_AGO, 900_000);
    await createLinkedGoal([{ type: 'investment', id: investmentId }], { targetCents: 1_020_000 });
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal).toMatchObject({ estimatedDate: '2026-12-15', status: 'on_track' });
  });

  it('should_ignore_the_archived_items_when_computing_the_pace', async () => {
    // Arrange
    const archivedConnectionId = await insertConnection(database.db);
    const archivedId = await insertInvestment(990_000, archivedConnectionId);
    await insertInvestmentSnapshot(database.db, archivedId, NINETY_DAYS_AGO, 900_000);
    await createLinkedGoal([{ type: 'investment', id: archivedId }]);
    await archiveConnection(database.db, archivedConnectionId, '2026-11-10T12:00:00Z');
    // Act
    const [goal] = await listGoals();
    // Assert
    expect(goal).toMatchObject({ monthlyRateCents: 0, savedCents: 0 });
  });
});
