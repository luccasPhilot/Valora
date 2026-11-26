import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { transactions, transactionTags } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
const TAGS_URL = '/api/v1/tags';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  accountId = await insertAccount(database.db);
});

afterEach(async () => {
  await testApp.app.close();
});

async function insertTransaction(
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(accountId, overrides))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

async function createTagId(name: string): Promise<string> {
  const response = await testApp.app.inject({ method: 'POST', url: TAGS_URL, payload: { name } });
  return response.json().id;
}

function patch(transactionId: string, payload: Record<string, unknown>) {
  return testApp.app.inject({
    method: 'PATCH',
    url: `${TRANSACTIONS_URL}/${transactionId}`,
    payload,
  });
}

async function listDescriptions(query: string): Promise<string[]> {
  const response = await testApp.app.inject({ method: 'GET', url: `${TRANSACTIONS_URL}${query}` });
  return response.json().items.map((item: { description: string }) => item.description);
}

describe('PATCH /api/v1/transactions/:id com nota e etiquetas', () => {
  it('should_save_note_and_tags_when_the_transaction_comes_from_open_finance', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    const tagId = await createTagId('Viagem');
    // Act
    const response = await patch(transactionId, {
      note: 'Jantar com o cliente, pedir reembolso',
      tagIds: [tagId],
    });
    // Assert
    expect({ statusCode: response.statusCode, body: response.json() }).toMatchObject({
      statusCode: 200,
      body: {
        note: 'Jantar com o cliente, pedir reembolso',
        tags: [{ id: tagId, name: 'Viagem' }],
        amountCents: -8990,
      },
    });
  });

  it('should_save_note_and_tags_when_the_transaction_is_manual', async () => {
    // Arrange
    const transactionId = await insertTransaction({ source: 'manual', categorySource: 'user' });
    const tagId = await createTagId('Reforma');
    // Act
    const response = await patch(transactionId, { note: 'Tinta', tagIds: [tagId] });
    // Assert
    expect(response.json()).toMatchObject({ note: 'Tinta', tags: [{ name: 'Reforma' }] });
  });

  it('should_replace_the_whole_tag_list_when_tag_ids_is_sent', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    const firstTagId = await createTagId('Viagem');
    const secondTagId = await createTagId('Reembolsável');
    await patch(transactionId, { tagIds: [firstTagId] });
    // Act
    const response = await patch(transactionId, { tagIds: [secondTagId] });
    // Assert
    expect(response.json().tags).toEqual([{ id: secondTagId, name: 'Reembolsável' }]);
  });

  it('should_store_null_when_the_note_is_blank', async () => {
    // Arrange
    const transactionId = await insertTransaction({ note: 'antiga', noteNormalized: 'ANTIGA' });
    // Act
    const response = await patch(transactionId, { note: '   ' });
    // Assert
    expect(response.json().note).toBeNull();
  });

  it('should_keep_the_tags_when_only_the_note_is_sent', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    const tagId = await createTagId('Viagem');
    await patch(transactionId, { tagIds: [tagId] });
    // Act
    const response = await patch(transactionId, { note: 'nova nota' });
    // Assert
    expect(response.json()).toMatchObject({ note: 'nova nota', tags: [{ id: tagId }] });
  });

  it('should_answer_400_with_note_in_details_when_the_note_has_501_characters', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await patch(transactionId, { note: 'a'.repeat(501) });
    // Assert
    expect({
      statusCode: response.statusCode,
      fields: response.json().error.details.map((detail: { field: string }) => detail.field),
    }).toEqual({ statusCode: 400, fields: ['note'] });
  });

  it('should_accept_a_note_with_exactly_500_characters', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await patch(transactionId, { note: 'a'.repeat(500) });
    // Assert
    expect(response.statusCode).toBe(200);
  });

  it('should_answer_400_when_more_than_10_tags_are_sent', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    const tagIds: string[] = [];
    for (let index = 0; index < 11; index += 1)
      tagIds.push(await createTagId(`Etiqueta ${String(index)}`));
    // Act
    const response = await patch(transactionId, { tagIds });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_answer_400_with_tag_ids_in_details_and_change_nothing_when_a_tag_does_not_exist', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await patch(transactionId, { note: 'não deve gravar', tagIds: [UNKNOWN_ID] });
    // Assert
    const [row] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    expect({
      statusCode: response.statusCode,
      fields: response.json().error.details.map((detail: { field: string }) => detail.field),
      note: row?.note,
    }).toEqual({ statusCode: 400, fields: ['tagIds'], note: null });
  });

  it('should_keep_answering_409_open_finance_read_only_when_amount_cents_is_sent_with_a_note', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await patch(transactionId, { amountCents: 100, note: 'x' });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'OPEN_FINANCE_READ_ONLY',
    });
  });

  it('should_change_category_and_note_together_when_both_are_sent_to_an_open_finance_transaction', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    const categoryId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    // Act
    const response = await patch(transactionId, { categoryId, note: 'feira' });
    // Assert
    expect(response.json()).toMatchObject({ note: 'feira', categorySource: 'user' });
  });
});

describe('filtro por etiqueta e busca na nota', () => {
  it('should_list_only_the_tagged_transactions_when_tag_id_is_given', async () => {
    // Arrange
    const tagId = await createTagId('Viagem Chile');
    const taggedId = await insertTransaction({ description: 'com etiqueta' });
    await insertTransaction({ description: 'sem etiqueta' });
    await patch(taggedId, { tagIds: [tagId] });
    // Act
    const descriptions = await listDescriptions(`?tagId=${tagId}`);
    // Assert
    expect(descriptions).toEqual(['com etiqueta']);
  });

  it('should_summarize_only_the_tagged_transactions_when_tag_id_is_given', async () => {
    // Arrange
    const tagId = await createTagId('Viagem Chile');
    const taggedId = await insertTransaction({ amountCents: -5000 });
    await insertTransaction({ amountCents: -7000 });
    await patch(taggedId, { tagIds: [tagId] });
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}/summary?tagId=${tagId}`,
    });
    // Assert
    expect(response.json()).toEqual({ incomeCents: 0, expenseCents: 5000, count: 1 });
  });

  it('should_find_the_term_in_the_note_without_case_and_accent_when_searching', async () => {
    // Arrange
    const transactionId = await insertTransaction({ description: 'jantar' });
    await insertTransaction({ description: 'outra compra' });
    await patch(transactionId, { note: 'Pedir REEMBOLSÓ à empresa' });
    // Act
    const descriptions = await listDescriptions('?search=reembolso');
    // Assert
    expect(descriptions).toEqual(['jantar']);
  });
});

describe('relatórios por etiqueta', () => {
  async function insertTaggedExpenses() {
    const tagId = await createTagId('Viagem Chile');
    const hotelCategoryId = await insertCategoryOfKind(database.db, 'expense', 'Hospedagem');
    const marketCategoryId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    const taggedId = await insertTransaction({
      date: '2026-10-10',
      amountCents: -30000,
      categoryId: hotelCategoryId,
    });
    await insertTransaction({
      date: '2026-10-11',
      amountCents: -9000,
      categoryId: marketCategoryId,
    });
    await patch(taggedId, { tagIds: [tagId] });
    return tagId;
  }

  it('should_report_only_tagged_spending_when_category_spending_receives_tag_id', async () => {
    // Arrange
    const tagId = await insertTaggedExpenses();
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/api/v1/reports/category-spending?from=2026-10&to=2026-10&tagId=${tagId}`,
    });
    // Assert
    expect(
      response
        .json()
        .series.map((item: { name: string; totalCents: number }) => [item.name, item.totalCents]),
    ).toEqual([['Hospedagem', 30000]]);
  });

  it('should_report_only_tagged_totals_when_income_expense_receives_tag_id', async () => {
    // Arrange
    const tagId = await insertTaggedExpenses();
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/api/v1/reports/income-expense?from=2026-10&to=2026-10&tagId=${tagId}`,
    });
    // Assert
    expect(response.json().totals).toMatchObject({ expenseCents: 30000 });
  });

  it('should_answer_400_with_tag_id_in_details_when_the_tag_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `/api/v1/reports/category-spending?tagId=${UNKNOWN_ID}`,
    });
    // Assert
    expect({
      statusCode: response.statusCode,
      fields: response.json().error.details.map((detail: { field: string }) => detail.field),
    }).toEqual({ statusCode: 400, fields: ['tagId'] });
  });
});

describe('juntar possível duplicata com nota e etiquetas', () => {
  it('should_carry_note_and_tags_of_the_manual_transaction_to_the_bank_one_when_merging', async () => {
    // Arrange
    const manualId = await insertTransaction({
      source: 'manual',
      categorySource: 'user',
      date: '2026-11-02',
    });
    const bankId = await insertTransaction({ date: '2026-11-03', possibleDuplicateOfId: manualId });
    const birthdayId = await createTagId('Aniversário');
    await patch(manualId, { note: 'Presente da Ana', tagIds: [birthdayId] });
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${TRANSACTIONS_URL}/${bankId}/duplicate-resolution`,
      payload: { action: 'merge' },
    });
    // Assert
    expect(response.json()).toMatchObject({
      note: 'Presente da Ana',
      tags: [{ name: 'Aniversário' }],
    });
  });

  it('should_keep_the_bank_note_and_join_the_tags_when_both_have_them', async () => {
    // Arrange
    const manualId = await insertTransaction({
      source: 'manual',
      categorySource: 'user',
      date: '2026-11-02',
    });
    const bankId = await insertTransaction({ date: '2026-11-03', possibleDuplicateOfId: manualId });
    const manualTagId = await createTagId('Aniversário');
    const bankTagId = await createTagId('Presente');
    await patch(manualId, { note: 'da manual', tagIds: [manualTagId] });
    await patch(bankId, { note: 'do banco', tagIds: [bankTagId] });
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${TRANSACTIONS_URL}/${bankId}/duplicate-resolution`,
      payload: { action: 'merge' },
    });
    // Assert
    expect({
      note: response.json().note,
      tags: response.json().tags.map((tag: { name: string }) => tag.name),
      links: await database.db.$count(transactionTags),
    }).toEqual({ note: 'do banco', tags: ['Aniversário', 'Presente'], links: 2 });
  });
});
