import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const CATEGORIES_URL = '/api/v1/categories';
const RULES_URL = '/api/v1/category-rules';
const MAPPINGS_URL = '/api/v1/pluggy-category-mappings';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database);
  await testApp.categorySeedService.run();
});

afterEach(async () => {
  await testApp.app.close();
});

interface CategoryBody {
  id: string;
  name: string;
  kind: string;
  isArchived: boolean;
}

async function listCategories(query = ''): Promise<CategoryBody[]> {
  const response = await testApp.app.inject({ method: 'GET', url: `${CATEGORIES_URL}${query}` });
  return response.json().items;
}

async function categoryNamed(name: string): Promise<CategoryBody> {
  const found = (await listCategories('?includeArchived=true')).find((item) => item.name === name);
  if (!found) throw new Error(`Teste: categoria ${name} não existe`);
  return found;
}

function createCategory(body: Record<string, unknown>) {
  return testApp.app.inject({ method: 'POST', url: CATEGORIES_URL, payload: body });
}

describe('GET /api/v1/categories', () => {
  it('should_list_the_default_categories_with_kind_and_icon', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: CATEGORIES_URL });
    // Assert
    expect(response.json().items).toContainEqual({
      id: expect.any(String),
      name: 'Pagamento de fatura',
      kind: 'transfer',
      icon: 'credit-card',
      isArchived: false,
    });
  });
});

describe('POST /api/v1/categories', () => {
  it('should_answer_201_with_the_new_category_when_the_payload_is_valid', async () => {
    // Arrange
    const payload = { name: '  Pets  ', kind: 'expense', icon: 'paw-print' };
    // Act
    const response = await createCategory(payload);
    // Assert
    expect({ statusCode: response.statusCode, body: response.json() }).toMatchObject({
      statusCode: 201,
      body: { name: 'Pets', kind: 'expense', icon: 'paw-print', isArchived: false },
    });
  });

  it('should_answer_409_category_name_taken_when_the_name_already_exists', async () => {
    // Arrange
    const payload = { name: 'Lazer', kind: 'expense', icon: 'ticket' };
    // Act
    const response = await createCategory(payload);
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'CATEGORY_NAME_TAKEN',
    });
  });

  it('should_answer_409_category_name_taken_when_only_the_letter_case_differs', async () => {
    // Arrange
    const payload = { name: 'lazer', kind: 'expense', icon: 'ticket' };
    // Act
    const response = await createCategory(payload);
    // Assert
    expect(response.json().error.code).toBe('CATEGORY_NAME_TAKEN');
  });

  it.each([
    { field: 'name', payload: { name: '   ', kind: 'expense', icon: 'ticket' } },
    { field: 'kind', payload: { name: 'Nova', kind: 'saving', icon: 'ticket' } },
    { field: 'icon', payload: { name: 'Nova', kind: 'expense', icon: 'Not An Icon' } },
  ])('should_answer_400_validation_error_when_$field_is_invalid', async ({ field, payload }) => {
    // Arrange
    // Act
    const response = await createCategory(payload);
    // Assert
    expect({
      statusCode: response.statusCode,
      fields: response.json().error.details.map((detail: { field: string }) => detail.field),
    }).toEqual({ statusCode: 400, fields: [field] });
  });
});

describe('PUT /api/v1/categories/:id', () => {
  it('should_rename_the_category_when_the_new_name_is_free', async () => {
    // Arrange
    const groceries = await categoryNamed('Mercado');
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${CATEGORIES_URL}/${groceries.id}`,
      payload: { name: 'Supermercado', kind: 'expense', icon: 'shopping-cart' },
    });
    // Assert
    expect(response.json()).toMatchObject({ id: groceries.id, name: 'Supermercado' });
  });

  it('should_answer_409_category_in_use_when_changing_the_kind_of_a_category_with_transactions', async () => {
    // Arrange
    const groceries = await categoryNamed('Mercado');
    const accountId = await insertAccount(database.db);
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { categoryId: groceries.id, categorySource: 'user' }));
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${CATEGORIES_URL}/${groceries.id}`,
      payload: { name: 'Mercado', kind: 'income', icon: 'shopping-cart' },
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'CATEGORY_IN_USE',
    });
  });

  it('should_change_the_kind_when_the_category_has_no_transactions', async () => {
    // Arrange
    const groceries = await categoryNamed('Mercado');
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${CATEGORIES_URL}/${groceries.id}`,
      payload: { name: 'Mercado', kind: 'income', icon: 'shopping-cart' },
    });
    // Assert
    expect(response.json().kind).toBe('income');
  });

  it('should_answer_404_when_the_category_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${CATEGORIES_URL}/${UNKNOWN_ID}`,
      payload: { name: 'Qualquer', kind: 'expense', icon: 'ticket' },
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/v1/categories/:id/archive', () => {
  it('should_hide_the_archived_category_from_the_default_list_and_keep_its_transactions', async () => {
    // Arrange
    const education = await categoryNamed('Educação');
    const accountId = await insertAccount(database.db);
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { categoryId: education.id, categorySource: 'user' }));
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${CATEGORIES_URL}/${education.id}/archive`,
    });
    // Assert
    const [stillCategorized] = await database.db.select().from(transactions);
    expect({
      archivedInResponse: response.json().isArchived,
      listed: (await listCategories()).some((item) => item.id === education.id),
      transactionCategoryId: stillCategorized?.categoryId,
    }).toEqual({ archivedInResponse: true, listed: false, transactionCategoryId: education.id });
  });

  it('should_still_list_the_archived_category_when_include_archived_is_true', async () => {
    // Arrange
    const education = await categoryNamed('Educação');
    await testApp.app.inject({ method: 'POST', url: `${CATEGORIES_URL}/${education.id}/archive` });
    // Act
    const items = await listCategories('?includeArchived=true');
    // Assert
    expect(items.find((item) => item.id === education.id)?.isArchived).toBe(true);
  });

  it('should_answer_404_when_archiving_a_category_that_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${CATEGORIES_URL}/${UNKNOWN_ID}/archive`,
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('/api/v1/category-rules', () => {
  async function createRule(body: Record<string, unknown>) {
    return testApp.app.inject({ method: 'POST', url: RULES_URL, payload: body });
  }

  it('should_answer_201_and_list_the_rule_when_the_payload_is_valid', async () => {
    // Arrange
    const food = await categoryNamed('Alimentação');
    // Act
    const created = await createRule({
      pattern: 'IFOOD',
      matchType: 'contains',
      categoryId: food.id,
    });
    const listed = await testApp.app.inject({ method: 'GET', url: RULES_URL });
    // Assert
    expect({
      statusCode: created.statusCode,
      listedIds: listed.json().items.map((r: { id: string }) => r.id),
    }).toEqual({
      statusCode: 201,
      listedIds: [created.json().id],
    });
  });

  it.each([
    { reason: 'an unknown match type', body: { pattern: 'X', matchType: 'regex' } },
    { reason: 'an empty pattern', body: { pattern: '  ', matchType: 'contains' } },
    { reason: 'a negative priority', body: { pattern: 'X', matchType: 'contains', priority: -1 } },
  ])('should_answer_400_when_the_rule_has_$reason', async ({ body }) => {
    // Arrange
    const food = await categoryNamed('Alimentação');
    // Act
    const response = await createRule({ ...body, categoryId: food.id });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_answer_400_when_the_category_of_the_rule_is_archived', async () => {
    // Arrange
    const education = await categoryNamed('Educação');
    await testApp.app.inject({ method: 'POST', url: `${CATEGORIES_URL}/${education.id}/archive` });
    // Act
    const response = await createRule({
      pattern: 'ESCOLA',
      matchType: 'contains',
      categoryId: education.id,
    });
    // Assert
    expect({
      statusCode: response.statusCode,
      field: response.json().error.details[0].field,
    }).toEqual({
      statusCode: 400,
      field: 'categoryId',
    });
  });

  it('should_answer_400_when_the_category_of_the_rule_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await createRule({
      pattern: 'ESCOLA',
      matchType: 'contains',
      categoryId: UNKNOWN_ID,
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_update_the_rule_and_answer_404_when_it_does_not_exist', async () => {
    // Arrange
    const food = await categoryNamed('Alimentação');
    const created = await createRule({
      pattern: 'IFOOD',
      matchType: 'contains',
      categoryId: food.id,
    });
    // Act
    const updated = await testApp.app.inject({
      method: 'PUT',
      url: `${RULES_URL}/${created.json().id}`,
      payload: { pattern: 'IFOOD', matchType: 'starts_with', categoryId: food.id, priority: 5 },
    });
    const missing = await testApp.app.inject({
      method: 'PUT',
      url: `${RULES_URL}/${UNKNOWN_ID}`,
      payload: { pattern: 'IFOOD', matchType: 'contains', categoryId: food.id },
    });
    // Assert
    expect({ updated: updated.json().matchType, missingStatus: missing.statusCode }).toEqual({
      updated: 'starts_with',
      missingStatus: 404,
    });
  });

  it('should_answer_204_when_deleting_a_rule_and_404_when_it_does_not_exist', async () => {
    // Arrange
    const food = await categoryNamed('Alimentação');
    const created = await createRule({
      pattern: 'IFOOD',
      matchType: 'contains',
      categoryId: food.id,
    });
    // Act
    const deleted = await testApp.app.inject({
      method: 'DELETE',
      url: `${RULES_URL}/${created.json().id}`,
    });
    const deletedAgain = await testApp.app.inject({
      method: 'DELETE',
      url: `${RULES_URL}/${created.json().id}`,
    });
    // Assert
    expect({ deleted: deleted.statusCode, deletedAgain: deletedAgain.statusCode }).toEqual({
      deleted: 204,
      deletedAgain: 404,
    });
  });
});

describe('/api/v1/pluggy-category-mappings', () => {
  it('should_list_known_pluggy_categories_with_the_mapped_category_or_null', async () => {
    // Arrange
    const groceries = await categoryNamed('Mercado');
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: MAPPINGS_URL });
    // Assert
    const items: { pluggyCategory: string; categoryId: string | null }[] = response.json().items;
    expect({
      groceries: items.find((item) => item.pluggyCategory === 'Groceries')?.categoryId,
      unmapped: items.find((item) => item.pluggyCategory === 'Transfer - PIX')?.categoryId,
    }).toEqual({ groceries: groceries.id, unmapped: null });
  });

  it('should_change_the_mapping_when_a_category_is_chosen', async () => {
    // Arrange
    const food = await categoryNamed('Alimentação');
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${MAPPINGS_URL}/${encodeURIComponent('Transfer - PIX')}`,
      payload: { categoryId: food.id },
    });
    // Assert
    expect(response.json()).toEqual({ pluggyCategory: 'Transfer - PIX', categoryId: food.id });
  });

  it('should_clear_the_mapping_when_the_category_is_null', async () => {
    // Arrange
    const url = `${MAPPINGS_URL}/Groceries`;
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url,
      payload: { categoryId: null },
    });
    // Assert
    const listed = (await testApp.app.inject({ method: 'GET', url: MAPPINGS_URL })).json().items;
    expect({
      body: response.json(),
      listed: listed.find(
        (item: { pluggyCategory: string }) => item.pluggyCategory === 'Groceries',
      ),
    }).toEqual({
      body: { pluggyCategory: 'Groceries', categoryId: null },
      listed: { pluggyCategory: 'Groceries', categoryId: null },
    });
  });

  it('should_answer_400_when_the_chosen_category_is_not_a_uuid', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'PUT',
      url: `${MAPPINGS_URL}/Groceries`,
      payload: { categoryId: 'mercado' },
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});
