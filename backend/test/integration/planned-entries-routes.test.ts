import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { plannedEntryOccurrences, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let expenseCategoryId: string;
let incomeCategoryId: string;
let transferCategoryId: string;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database);
  expenseCategoryId = await insertCategoryOfKind(database.db, 'expense', 'Moradia');
  incomeCategoryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
  transferCategoryId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
  accountId = await insertAccount(database.db);
});

afterEach(async () => {
  await testApp.app.close();
});

function entryBody(overrides: Record<string, unknown> = {}) {
  return {
    description: 'Aluguel',
    type: 'expense',
    amountCents: 180000,
    categoryId: expenseCategoryId,
    dayOfMonth: 10,
    recurrence: 'monthly',
    startMonth: '2026-12',
    ...overrides,
  };
}

async function createEntry(overrides: Record<string, unknown> = {}) {
  const response = await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/planned-entries',
    payload: entryBody(overrides),
  });
  return response.json();
}

async function getMonth(month: string) {
  const response = await testApp.app.inject({
    method: 'GET',
    url: `/api/v1/planned-entries?month=${month}`,
  });
  return response.json();
}

function decide(entryId: string, month: string, payload: Record<string, unknown>) {
  return testApp.app.inject({
    method: 'PUT',
    url: `/api/v1/planned-entries/${entryId}/occurrences/${month}`,
    payload,
  });
}

async function insertTransaction(overrides: Parameters<typeof transactionValues>[1] = {}) {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(accountId, overrides))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

describe('POST /api/v1/planned-entries', () => {
  it('should_store_an_expense_with_a_negative_amount_when_it_is_created', async () => {
    // Arrange & Act
    const entry = await createEntry();
    // Assert
    expect(entry).toMatchObject({
      description: 'Aluguel',
      amountCents: -180000,
      recurrence: 'monthly',
      startMonth: '2026-12',
      endMonth: null,
      isActive: true,
    });
  });

  it('should_store_an_income_with_a_positive_amount_when_it_is_created', async () => {
    // Arrange & Act
    const entry = await createEntry({
      type: 'income',
      categoryId: incomeCategoryId,
      amountCents: 500000,
    });
    // Assert
    expect(entry.amountCents).toBe(500000);
  });

  it('should_refuse_a_transfer_category_when_the_entry_is_created', async () => {
    // Arrange & Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/planned-entries',
      payload: entryBody({ categoryId: transferCategoryId }),
    });
    // Assert
    expect(response.json().error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'categoryId' }],
    });
  });

  it('should_refuse_an_expense_category_when_the_entry_is_an_income', async () => {
    // Arrange & Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/planned-entries',
      payload: entryBody({ type: 'income' }),
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_refuse_the_entry_when_the_end_month_is_before_the_start_month', async () => {
    // Arrange & Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/planned-entries',
      payload: entryBody({ startMonth: '2026-12', endMonth: '2026-11' }),
    });
    // Assert
    expect(response.json().error.details).toEqual([
      { field: 'endMonth', message: 'O mês de fim não pode ser antes do início' },
    ]);
  });

  it('should_refuse_the_entry_when_the_day_is_out_of_range', async () => {
    // Arrange & Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/planned-entries',
      payload: entryBody({ dayOfMonth: 32 }),
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/planned-entries occurrences', () => {
  it('should_list_the_occurrence_when_a_monthly_entry_is_inside_its_period', async () => {
    // Arrange
    await createEntry({ endMonth: '2027-02' });
    // Act
    const body = await getMonth('2027-01');
    // Assert
    expect(body.items).toHaveLength(1);
  });

  it('should_not_list_the_occurrence_when_the_monthly_entry_already_ended', async () => {
    // Arrange
    await createEntry({ endMonth: '2027-02' });
    // Act
    const body = await getMonth('2027-03');
    // Assert
    expect(body.items).toEqual([]);
  });

  it('should_list_a_yearly_entry_only_in_its_month_each_year', async () => {
    // Arrange
    await createEntry({ recurrence: 'yearly', startMonth: '2026-03' });
    // Act
    const counts = [
      (await getMonth('2027-03')).items.length,
      (await getMonth('2027-04')).items.length,
    ];
    // Assert
    expect(counts).toEqual([1, 0]);
  });

  it('should_use_the_last_day_of_february_when_the_entry_is_on_day_31', async () => {
    // Arrange
    await createEntry({ dayOfMonth: 31, startMonth: '2027-01' });
    // Act
    const body = await getMonth('2027-02');
    // Assert
    expect(body.items[0].date).toBe('2027-02-28');
  });

  it('should_move_a_paused_entry_to_the_paused_list_when_it_is_deactivated', async () => {
    // Arrange
    const entry = await createEntry();
    await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/planned-entries/${entry.id}`,
      payload: entryBody({ isActive: false }),
    });
    // Act
    const body = await getMonth('2026-12');
    // Assert
    expect({
      items: body.items,
      paused: body.pausedEntries.map((paused: { id: string }) => paused.id),
    }).toEqual({
      items: [],
      paused: [entry.id],
    });
  });

  it('should_sum_the_totals_by_status_when_there_are_incomes_and_expenses', async () => {
    // Arrange
    await createEntry();
    await createEntry({
      description: 'Salário',
      type: 'income',
      categoryId: incomeCategoryId,
      amountCents: 500000,
      dayOfMonth: 5,
    });
    // Act
    const body = await getMonth('2026-12');
    // Assert
    expect(body.totals.pending).toEqual({ incomeCents: 500000, expenseCents: 180000 });
  });

  it('should_return_the_occurrences_ordered_by_date_when_there_are_several', async () => {
    // Arrange
    await createEntry();
    await createEntry({ description: 'Internet', amountCents: 10000, dayOfMonth: 3 });
    // Act
    const body = await getMonth('2026-12');
    // Assert
    expect(
      body.items.map((item: { entry: { description: string } }) => item.entry.description),
    ).toEqual(['Internet', 'Aluguel']);
  });
});

describe('PUT /api/v1/planned-entries/:id/occurrences/:month realize', () => {
  it('should_link_the_transaction_when_it_is_compatible', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({
      date: '2026-12-11',
      amountCents: -180000,
      categoryId: expenseCategoryId,
    });
    // Act
    const response = await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Assert
    expect(response.json()).toMatchObject({
      status: 'realized',
      transaction: { id: transactionId },
    });
  });

  it('should_realize_without_a_link_when_no_transaction_is_given', async () => {
    // Arrange
    const entry = await createEntry();
    // Act
    const response = await decide(entry.id, '2026-12', { action: 'realize' });
    // Assert
    expect(response.json()).toMatchObject({ status: 'realized', transaction: null });
  });

  it('should_refuse_with_409_when_the_transaction_is_linked_to_another_occurrence', async () => {
    // Arrange
    const first = await createEntry();
    const second = await createEntry({ description: 'Condomínio' });
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: -180000 });
    await decide(first.id, '2026-12', { action: 'realize', transactionId });
    // Act
    const response = await decide(second.id, '2026-12', { action: 'realize', transactionId });
    // Assert
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TRANSACTION_ALREADY_LINKED');
  });

  it('should_keep_the_first_link_untouched_when_the_second_attempt_is_refused', async () => {
    // Arrange
    const first = await createEntry();
    const second = await createEntry({ description: 'Condomínio' });
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: -180000 });
    await decide(first.id, '2026-12', { action: 'realize', transactionId });
    await decide(second.id, '2026-12', { action: 'realize', transactionId });
    // Act
    const rows = await database.db.select().from(plannedEntryOccurrences);
    // Assert
    expect(rows.map((row) => row.plannedEntryId)).toEqual([first.id]);
  });

  it('should_refuse_with_422_when_the_transaction_has_the_opposite_sign', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: 180000 });
    // Act
    const response = await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Assert
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('TRANSACTION_NOT_COMPATIBLE');
  });

  it('should_refuse_with_422_when_the_transaction_is_from_another_month', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({ date: '2026-11-28', amountCents: -180000 });
    // Act
    const response = await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Assert
    expect(response.statusCode).toBe(422);
  });

  it('should_accept_the_same_link_again_when_the_occurrence_is_realized_twice', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: -180000 });
    await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Act
    const response = await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Assert
    expect(response.statusCode).toBe(200);
  });

  it('should_answer_404_when_the_entry_has_no_occurrence_in_the_month', async () => {
    // Arrange
    const entry = await createEntry({ recurrence: 'none' });
    // Act
    const response = await decide(entry.id, '2027-03', { action: 'realize' });
    // Assert
    expect(response.statusCode).toBe(404);
  });

  it('should_keep_the_occurrence_realized_without_link_when_the_linked_transaction_is_deleted', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: -180000 });
    await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Act
    await database.db.delete(transactions).where(eq(transactions.id, transactionId));
    // Assert
    const [occurrence] = (await getMonth('2026-12')).items;
    expect(occurrence).toMatchObject({ status: 'realized', transaction: null });
  });
});

describe('PUT/DELETE occurrences skip and undo', () => {
  it('should_skip_only_that_month_when_the_entry_is_monthly', async () => {
    // Arrange
    const entry = await createEntry({ startMonth: '2026-12' });
    // Act
    await decide(entry.id, '2027-01', { action: 'skip' });
    // Assert
    expect([
      (await getMonth('2027-01')).items[0].status,
      (await getMonth('2027-02')).items[0].status,
    ]).toEqual(['skipped', 'pending']);
  });

  it('should_return_to_pending_and_drop_the_link_when_the_decision_is_undone', async () => {
    // Arrange
    const entry = await createEntry();
    const transactionId = await insertTransaction({ date: '2026-12-11', amountCents: -180000 });
    await decide(entry.id, '2026-12', { action: 'realize', transactionId });
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/planned-entries/${entry.id}/occurrences/2026-12`,
    });
    // Assert
    expect(response.statusCode).toBe(204);
    expect((await getMonth('2026-12')).items[0]).toMatchObject({
      status: 'pending',
      transaction: null,
    });
  });

  it('should_answer_404_when_there_is_no_decision_to_undo', async () => {
    // Arrange
    const entry = await createEntry();
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/planned-entries/${entry.id}/occurrences/2026-12`,
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('PUT and DELETE /api/v1/planned-entries/:id', () => {
  it('should_change_the_entry_for_every_month_when_it_is_edited', async () => {
    // Arrange
    const entry = await createEntry();
    // Act
    await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/planned-entries/${entry.id}`,
      payload: entryBody({ amountCents: 200000 }),
    });
    // Assert
    expect((await getMonth('2027-05')).items[0].entry.amountCents).toBe(-200000);
  });

  it('should_delete_the_decisions_with_the_entry_when_it_is_removed', async () => {
    // Arrange
    const entry = await createEntry();
    await decide(entry.id, '2026-12', { action: 'skip' });
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/planned-entries/${entry.id}`,
    });
    // Assert
    expect(response.statusCode).toBe(204);
    expect(await database.db.$count(plannedEntryOccurrences)).toBe(0);
  });

  it('should_answer_404_when_the_entry_to_delete_does_not_exist', async () => {
    // Arrange & Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: '/api/v1/planned-entries/00000000-0000-4000-8000-000000000000',
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('candidates for linking', () => {
  it('should_suggest_a_close_value_in_another_category_when_it_is_within_7_days', async () => {
    // Arrange
    await createEntry({ amountCents: 20000, dayOfMonth: 10 });
    const transactionId = await insertTransaction({
      date: '2026-12-12',
      amountCents: -18700,
      categoryId: null,
    });
    // Act
    const [occurrence] = (await getMonth('2026-12')).items;
    // Assert
    expect(occurrence.candidates.map((candidate: { id: string }) => candidate.id)).toEqual([
      transactionId,
    ]);
  });

  it('should_not_suggest_a_transaction_when_the_value_is_too_different', async () => {
    // Arrange
    await createEntry({ amountCents: 20000, dayOfMonth: 10 });
    await insertTransaction({ date: '2026-12-12', amountCents: -2000 });
    // Act
    const [occurrence] = (await getMonth('2026-12')).items;
    // Assert
    expect(occurrence.candidates).toEqual([]);
  });

  it('should_not_suggest_a_transaction_already_linked_to_another_occurrence', async () => {
    // Arrange
    const first = await createEntry({ amountCents: 20000, dayOfMonth: 10 });
    await createEntry({ description: 'Outra', amountCents: 20000, dayOfMonth: 11 });
    const transactionId = await insertTransaction({ date: '2026-12-12', amountCents: -20000 });
    await decide(first.id, '2026-12', { action: 'realize', transactionId });
    // Act
    const items = (await getMonth('2026-12')).items;
    const pending = items.find((item: { status: string }) => item.status === 'pending');
    // Assert
    expect(pending.candidates).toEqual([]);
  });

  it('should_not_suggest_a_transfer_when_the_value_matches', async () => {
    // Arrange
    await createEntry({ amountCents: 20000, dayOfMonth: 10 });
    await insertTransaction({
      date: '2026-12-10',
      amountCents: -20000,
      categoryId: transferCategoryId,
    });
    // Act
    const [occurrence] = (await getMonth('2026-12')).items;
    // Assert
    expect(occurrence.candidates).toEqual([]);
  });
});
