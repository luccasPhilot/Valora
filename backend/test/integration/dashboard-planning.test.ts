import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, insertConnection } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const CURRENT_MONTH = '2026-11';
const PAST_MONTH = '2026-10';

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

async function insertCheckingAccount(balanceCents: number): Promise<void> {
  const connectionId = await insertConnection(database.db);
  await insertAccountWith(database.db, { connectionId, type: 'checking', balanceCents });
}

async function createPlannedExpense(amountCents: number, dayOfMonth: number): Promise<void> {
  const categoryId = await insertCategoryOfKind(database.db, 'expense', 'Moradia');
  await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/planned-entries',
    payload: {
      description: 'Aluguel',
      type: 'expense',
      amountCents,
      categoryId,
      dayOfMonth,
      recurrence: 'monthly',
      startMonth: CURRENT_MONTH,
    },
  });
}

async function createGoal(name: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const response = await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/goals',
    payload: { name, icon: 'plane', targetCents: 1_000_000, ...overrides },
  });
  if (response.statusCode !== 201) throw new Error(`Teste: meta ${name} não foi criada`);
}

describe('GET /api/v1/dashboard — projeção', () => {
  it('should_return_the_same_summary_as_the_full_projection_when_the_month_is_the_current_one', async () => {
    // Arrange
    await insertCheckingAccount(500_000);
    await createPlannedExpense(120_000, 20);
    // Act
    const dashboard = await getJson(`/api/v1/dashboard?month=${CURRENT_MONTH}`);
    const projection = await getJson('/api/v1/projection');
    // Assert
    expect(dashboard.projection).toEqual({
      projectedBalanceCents: projection.projectedBalanceCents,
      lowestBalanceCents: projection.lowestBalanceCents,
      lowestBalanceDate: projection.lowestBalanceDate,
      hasPlannedItems: true,
    });
  });

  it('should_return_the_projection_when_no_month_is_requested', async () => {
    // Arrange
    await insertCheckingAccount(500_000);
    await createPlannedExpense(120_000, 20);
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.projection).toMatchObject({ projectedBalanceCents: 380_000 });
  });

  it('should_return_null_projection_when_the_month_is_in_the_past', async () => {
    // Arrange
    await insertCheckingAccount(500_000);
    // Act
    const dashboard = await getJson(`/api/v1/dashboard?month=${PAST_MONTH}`);
    // Assert
    expect(dashboard.projection).toBeNull();
  });

  it('should_return_has_planned_items_false_when_nothing_is_planned', async () => {
    // Arrange
    await insertCheckingAccount(500_000);
    // Act
    const dashboard = await getJson(`/api/v1/dashboard?month=${CURRENT_MONTH}`);
    // Assert
    expect(dashboard.projection).toMatchObject({
      projectedBalanceCents: 500_000,
      hasPlannedItems: false,
    });
  });
});

describe('GET /api/v1/dashboard — metas', () => {
  it('should_return_the_three_nearest_goals_and_the_total_when_there_are_five_active_goals', async () => {
    // Arrange
    await createGoal('Sem prazo');
    await createGoal('Prazo longe', { targetDate: '2028-01-01' });
    await createGoal('Prazo perto', { targetDate: '2026-12-01' });
    await createGoal('Prazo médio', { targetDate: '2027-06-01' });
    await createGoal('Prazo curto', { targetDate: '2027-01-01' });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect({
      names: dashboard.goals.items.map((goal: { name: string }) => goal.name),
      activeCount: dashboard.goals.activeCount,
    }).toEqual({ names: ['Prazo perto', 'Prazo curto', 'Prazo médio'], activeCount: 5 });
  });

  it('should_return_no_goals_when_all_of_them_are_completed', async () => {
    // Arrange
    await createGoal('Viagem', { initialCents: 1_000_000 });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.goals).toEqual({ items: [], activeCount: 0 });
  });

  it('should_skip_completed_goals_and_keep_the_active_ones', async () => {
    // Arrange
    await createGoal('Concluída', { initialCents: 1_000_000, targetDate: '2026-11-20' });
    await createGoal('Em andamento', { targetDate: '2027-06-01' });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.goals.items.map((goal: { name: string }) => goal.name)).toEqual([
      'Em andamento',
    ]);
  });

  it('should_return_the_same_progress_and_status_as_the_goals_list', async () => {
    // Arrange
    await createGoal('Atrasada', { initialCents: 400_000, targetDate: '2026-11-01' });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    const {
      items: [goal],
    } = await getJson('/api/v1/goals');
    // Assert
    expect(dashboard.goals.items[0]).toEqual({
      id: goal.id,
      name: goal.name,
      icon: goal.icon,
      targetCents: goal.targetCents,
      savedCents: goal.savedCents,
      percent: goal.progressPercent,
      status: goal.status,
      estimatedDate: goal.estimatedDate,
      requiredMonthlyCents: goal.requiredMonthlyCents,
    });
  });

  it('should_return_a_behind_goal_with_forty_percent_when_the_deadline_has_passed', async () => {
    // Arrange
    await createGoal('Atrasada', { initialCents: 400_000, targetDate: '2026-11-01' });
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard.goals.items[0]).toMatchObject({ percent: 40, status: 'behind' });
  });
});

describe('GET /api/v1/dashboard — campos existentes', () => {
  it('should_keep_the_existing_fields_when_the_planning_blocks_are_added', async () => {
    // Arrange
    await insertCheckingAccount(500_000);
    // Act
    const dashboard = await getJson('/api/v1/dashboard');
    // Assert
    expect(dashboard).toMatchObject({ month: CURRENT_MONTH, totalBalanceCents: 500_000 });
  });
});
