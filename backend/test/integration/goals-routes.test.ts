import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { goalContributions, goals } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const TODAY = '2026-11-15';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

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

interface GoalBody {
  name?: string;
  icon?: string;
  targetCents?: number;
  targetDate?: string | null;
  initialCents?: number;
}

async function createGoal(overrides: GoalBody = {}) {
  const response = await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/goals',
    payload: { name: 'Viagem', icon: 'plane', targetCents: 1000000, ...overrides },
  });
  return { statusCode: response.statusCode, body: response.json() };
}

async function postContribution(
  goalId: string,
  payload: { type: 'deposit' | 'withdrawal'; amountCents: number; date?: string },
) {
  const response = await testApp.app.inject({
    method: 'POST',
    url: `/api/v1/goals/${goalId}/contributions`,
    payload: { date: TODAY, ...payload },
  });
  return { statusCode: response.statusCode, body: response.json() };
}

async function deleteContribution(goalId: string, contributionId: string) {
  const response = await testApp.app.inject({
    method: 'DELETE',
    url: `/api/v1/goals/${goalId}/contributions/${contributionId}`,
  });
  return { statusCode: response.statusCode, body: response.json() };
}

async function listGoals() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/goals' });
  return response.json();
}

async function savedCentsOf(goalId: string): Promise<number | undefined> {
  const [row] = await database.db
    .select({ savedCents: goals.savedCents })
    .from(goals)
    .where(eq(goals.id, goalId));
  return row?.savedCents;
}

describe('POST /api/v1/goals', () => {
  it('should_create_the_goal_with_the_initial_value_when_it_is_informed', async () => {
    // Arrange
    const payload = { initialCents: 150000 };
    // Act
    const { statusCode, body } = await createGoal(payload);
    // Assert
    expect(statusCode).toBe(201);
    expect(body).toMatchObject({
      name: 'Viagem',
      targetCents: 1000000,
      savedCents: 150000,
      progressPercent: 15,
      status: 'no_pace',
    });
  });

  it('should_record_the_initial_value_as_an_initial_contribution_when_it_is_informed', async () => {
    // Arrange
    const payload = { initialCents: 150000 };
    // Act
    const { body } = await createGoal(payload);
    // Assert
    const rows = await database.db
      .select({ amountCents: goalContributions.amountCents, kind: goalContributions.kind })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, body.id));
    expect(rows).toEqual([{ amountCents: 150000, kind: 'initial' }]);
  });

  it('should_not_create_a_contribution_when_there_is_no_initial_value', async () => {
    // Arrange
    const payload = {};
    // Act
    const { body } = await createGoal(payload);
    // Assert
    expect(body).toMatchObject({ savedCents: 0, recentContributions: [] });
  });

  it('should_reject_with_target_cents_in_details_when_the_target_is_zero', async () => {
    // Arrange
    const payload = { targetCents: 0 };
    // Act
    const { statusCode, body } = await createGoal(payload);
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'targetCents' }],
    });
  });

  it('should_reject_when_the_name_is_blank', async () => {
    // Arrange
    const payload = { name: '   ' };
    // Act
    const { statusCode } = await createGoal(payload);
    // Assert
    expect(statusCode).toBe(400);
  });

  it('should_not_expose_columns_outside_the_contract_when_returning_a_goal', async () => {
    // Arrange
    const payload = {};
    // Act
    const { body } = await createGoal(payload);
    // Assert
    expect(Object.keys(body)).not.toContain('createdAt');
  });
});

describe('PUT /api/v1/goals/:id', () => {
  it('should_change_the_goal_fields_and_keep_the_saved_value_when_updating', async () => {
    // Arrange
    const { body: created } = await createGoal({ initialCents: 150000 });
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/goals/${created.id}`,
      payload: { name: 'Europa', icon: 'globe', targetCents: 2000000, targetDate: '2027-12-01' },
    });
    // Assert
    expect(response.json()).toMatchObject({
      name: 'Europa',
      targetCents: 2000000,
      targetDate: '2027-12-01',
      savedCents: 150000,
    });
  });

  it('should_respond_404_when_the_goal_does_not_exist', async () => {
    // Arrange
    const payload = { name: 'Europa', icon: 'globe', targetCents: 2000000 };
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/goals/${UNKNOWN_ID}`,
      payload,
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/v1/goals/:id/contributions', () => {
  it('should_add_the_deposit_to_the_saved_value_when_registering_a_deposit', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 150000 });
    // Act
    const { statusCode, body } = await postContribution(goal.id, {
      type: 'deposit',
      amountCents: 50000,
    });
    // Assert
    expect(statusCode).toBe(201);
    expect(body.savedCents).toBe(200000);
  });

  it('should_subtract_the_withdrawal_and_store_it_negative_when_registering_a_withdrawal', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 150000 });
    // Act
    const { body } = await postContribution(goal.id, { type: 'withdrawal', amountCents: 50000 });
    // Assert
    expect(body).toMatchObject({
      savedCents: 100000,
      recentContributions: [{ kind: 'withdrawal', amountCents: -50000 }, { kind: 'initial' }],
    });
  });

  it('should_reject_and_keep_the_saved_value_when_the_withdrawal_exceeds_it', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 20000 });
    // Act
    const { statusCode, body } = await postContribution(goal.id, {
      type: 'withdrawal',
      amountCents: 30000,
    });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(await savedCentsOf(goal.id)).toBe(20000);
  });

  it('should_allow_withdrawing_exactly_the_saved_value_when_registering_a_withdrawal', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 20000 });
    // Act
    const { body } = await postContribution(goal.id, { type: 'withdrawal', amountCents: 20000 });
    // Assert
    expect(body.savedCents).toBe(0);
  });

  it('should_reject_with_date_in_details_when_the_date_is_tomorrow', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    // Act
    const { statusCode, body } = await postContribution(goal.id, {
      type: 'deposit',
      amountCents: 50000,
      date: '2026-11-16',
    });
    // Assert
    expect(statusCode).toBe(400);
    expect(body.error.details).toEqual([expect.objectContaining({ field: 'date' })]);
  });

  it('should_accept_a_deposit_dated_today', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    // Act
    const { statusCode } = await postContribution(goal.id, {
      type: 'deposit',
      amountCents: 50000,
      date: TODAY,
    });
    // Assert
    expect(statusCode).toBe(201);
  });

  it('should_reject_when_the_amount_is_zero', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    // Act
    const { statusCode } = await postContribution(goal.id, { type: 'deposit', amountCents: 0 });
    // Assert
    expect(statusCode).toBe(400);
  });

  it('should_respond_404_when_the_goal_does_not_exist', async () => {
    // Arrange
    const goalId = UNKNOWN_ID;
    // Act
    const { statusCode } = await postContribution(goalId, { type: 'deposit', amountCents: 100 });
    // Assert
    expect(statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/goals/:id/contributions/:contributionId', () => {
  it('should_undo_the_effect_on_the_saved_value_when_removing_a_deposit', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 150000 });
    const { body: afterDeposit } = await postContribution(goal.id, {
      type: 'deposit',
      amountCents: 50000,
    });
    const depositId = afterDeposit.recentContributions[0].id;
    // Act
    const { statusCode, body } = await deleteContribution(goal.id, depositId);
    // Assert
    expect(statusCode).toBe(200);
    expect(body.savedCents).toBe(150000);
  });

  it('should_give_the_withdrawn_amount_back_when_removing_a_withdrawal', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 150000 });
    const { body: afterWithdrawal } = await postContribution(goal.id, {
      type: 'withdrawal',
      amountCents: 50000,
    });
    const withdrawalId = afterWithdrawal.recentContributions[0].id;
    // Act
    const { body } = await deleteContribution(goal.id, withdrawalId);
    // Assert
    expect(body.savedCents).toBe(150000);
  });

  it('should_refuse_and_keep_everything_when_removal_would_leave_the_saved_value_below_zero', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    const { body: afterDeposit } = await postContribution(goal.id, {
      type: 'deposit',
      amountCents: 50000,
    });
    await postContribution(goal.id, { type: 'withdrawal', amountCents: 30000 });
    const depositId = afterDeposit.recentContributions[0].id;
    // Act
    const { statusCode } = await deleteContribution(goal.id, depositId);
    // Assert
    expect(statusCode).toBe(409);
    expect(await savedCentsOf(goal.id)).toBe(20000);
  });

  it('should_respond_404_when_the_contribution_belongs_to_another_goal', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    const { body: otherGoal } = await createGoal({ name: 'Carro', initialCents: 1000 });
    const foreignContributionId = otherGoal.recentContributions[0].id;
    // Act
    const { statusCode } = await deleteContribution(goal.id, foreignContributionId);
    // Assert
    expect(statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/goals/:id', () => {
  it('should_delete_the_goal_and_its_contributions_when_deleting', async () => {
    // Arrange
    const { body: goal } = await createGoal({ initialCents: 150000 });
    await postContribution(goal.id, { type: 'deposit', amountCents: 50000 });
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/goals/${goal.id}`,
    });
    // Assert
    expect(response.statusCode).toBe(204);
    expect(await database.db.select().from(goalContributions)).toEqual([]);
    expect(await database.db.select().from(goals)).toEqual([]);
  });

  it('should_respond_404_when_the_goal_does_not_exist', async () => {
    // Arrange
    const goalId = UNKNOWN_ID;
    // Act
    const response = await testApp.app.inject({ method: 'DELETE', url: `/api/v1/goals/${goalId}` });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/v1/goals', () => {
  it('should_list_pending_goals_by_nearest_deadline_then_completed_last_when_there_are_several', async () => {
    // Arrange
    await createGoal({ name: 'Sem prazo' });
    await createGoal({ name: 'Prazo longe', targetDate: '2027-06-01' });
    await createGoal({
      name: 'Concluída',
      targetCents: 1000,
      initialCents: 1000,
      targetDate: '2026-12-01',
    });
    await createGoal({ name: 'Prazo perto', targetDate: '2027-01-01' });
    // Act
    const { items } = await listGoals();
    // Assert
    expect(items.map((goal: { name: string }) => goal.name)).toEqual([
      'Prazo perto',
      'Prazo longe',
      'Sem prazo',
      'Concluída',
    ]);
  });

  it('should_estimate_pace_and_date_from_the_last_contributions_when_there_is_pace', async () => {
    // Arrange
    const { body: goal } = await createGoal({ targetCents: 330000 });
    await postContribution(goal.id, { type: 'deposit', amountCents: 30000, date: '2026-11-10' });
    // Act
    const { items } = await listGoals();
    // Assert
    expect(items[0]).toMatchObject({
      status: 'on_track',
      monthlyRateCents: 30000,
      estimatedDate: '2027-09-15',
      remainingCents: 300000,
    });
  });

  it('should_be_no_pace_when_the_goal_only_has_the_initial_value', async () => {
    // Arrange
    await createGoal({ initialCents: 150000 });
    // Act
    const { items } = await listGoals();
    // Assert
    expect(items[0].status).toBe('no_pace');
  });

  it('should_be_behind_with_the_required_monthly_amount_when_the_pace_misses_the_deadline', async () => {
    // Arrange
    const { body: goal } = await createGoal({ targetCents: 300000, targetDate: '2027-05-15' });
    await postContribution(goal.id, { type: 'deposit', amountCents: 20000, date: '2026-11-10' });
    // Act
    const { items } = await listGoals();
    // Assert
    expect(items[0]).toMatchObject({ status: 'behind', requiredMonthlyCents: 46667 });
  });

  it('should_return_only_the_10_most_recent_contributions_when_a_goal_has_more', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    for (let day = 1; day <= 12; day += 1) {
      await postContribution(goal.id, {
        type: 'deposit',
        amountCents: 100,
        date: `2026-11-${String(day).padStart(2, '0')}`,
      });
    }
    // Act
    const { items } = await listGoals();
    // Assert
    expect(items[0].recentContributions).toHaveLength(10);
    expect(items[0].recentContributions[0].date).toBe('2026-11-12');
  });

  it('should_return_an_empty_list_when_there_are_no_goals', async () => {
    // Arrange
    // (sem metas)
    // Act
    const body = await listGoals();
    // Assert
    expect(body).toEqual({ items: [] });
  });
});

describe('GET /api/v1/goals/:id/contributions', () => {
  async function getContributions(goalId: string, query = '') {
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/api/v1/goals/${goalId}/contributions${query}`,
    });
    return { statusCode: response.statusCode, body: response.json() };
  }

  it('should_paginate_the_history_newest_first_when_listing_contributions', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    for (const date of ['2026-11-01', '2026-11-03', '2026-11-02']) {
      await postContribution(goal.id, { type: 'deposit', amountCents: 100, date });
    }
    // Act
    const { body } = await getContributions(goal.id, '?page=1&limit=2');
    // Assert
    expect(body.pagination).toEqual({ page: 1, limit: 2, total: 3 });
    expect(body.items.map((contribution: { date: string }) => contribution.date)).toEqual([
      '2026-11-03',
      '2026-11-02',
    ]);
  });

  it('should_return_the_remaining_contributions_when_asking_for_the_next_page', async () => {
    // Arrange
    const { body: goal } = await createGoal();
    for (const date of ['2026-11-01', '2026-11-03', '2026-11-02']) {
      await postContribution(goal.id, { type: 'deposit', amountCents: 100, date });
    }
    // Act
    const { body } = await getContributions(goal.id, '?page=2&limit=2');
    // Assert
    expect(body.items).toEqual([expect.objectContaining({ date: '2026-11-01' })]);
  });

  it('should_respond_404_when_the_goal_does_not_exist', async () => {
    // Arrange
    const goalId = UNKNOWN_ID;
    // Act
    const { statusCode } = await getContributions(goalId);
    // Assert
    expect(statusCode).toBe(404);
  });
});
