import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tags, transactions, transactionTags } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TAGS_URL = '/api/v1/tags';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

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

async function createTag(name: string) {
  return testApp.app.inject({ method: 'POST', url: TAGS_URL, payload: { name } });
}

async function createTagId(name: string): Promise<string> {
  return (await createTag(name)).json().id;
}

async function insertTaggedTransactions(tagId: string, howMany: number): Promise<string[]> {
  const accountId = await insertAccount(database.db);
  const transactionIds: string[] = [];
  for (let index = 0; index < howMany; index += 1) {
    const [row] = await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { description: `Compra ${String(index)}` }))
      .returning({ id: transactions.id });
    if (!row) throw new Error('Teste: transação não foi criada');
    await database.db.insert(transactionTags).values({ transactionId: row.id, tagId });
    transactionIds.push(row.id);
  }
  return transactionIds;
}

describe('POST /api/v1/tags', () => {
  it('should_create_the_tag_with_zero_transactions_when_the_name_is_new', async () => {
    // Arrange
    // Act
    const response = await createTag('  Viagem  ');
    // Assert
    expect({ statusCode: response.statusCode, body: response.json() }).toMatchObject({
      statusCode: 201,
      body: { name: 'Viagem', transactionCount: 0 },
    });
  });

  it('should_answer_409_tag_already_exists_when_the_name_differs_only_by_case_and_accents', async () => {
    // Arrange
    await createTag('Aniversário');
    // Act
    const response = await createTag('aniversario');
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'TAG_ALREADY_EXISTS',
    });
  });

  it('should_answer_400_when_the_name_has_more_than_40_characters', async () => {
    // Arrange
    // Act
    const response = await createTag('a'.repeat(41));
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_answer_400_when_the_name_is_blank', async () => {
    // Arrange
    // Act
    const response = await createTag('   ');
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/tags', () => {
  it('should_list_by_name_with_the_transaction_count_when_tags_are_used', async () => {
    // Arrange
    await createTag('Reforma');
    const tripId = await createTagId('Viagem');
    await insertTaggedTransactions(tripId, 2);
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: TAGS_URL });
    // Assert
    expect(
      response
        .json()
        .items.map((tag: { name: string; transactionCount: number }) => [
          tag.name,
          tag.transactionCount,
        ]),
    ).toEqual([
      ['Reforma', 0],
      ['Viagem', 2],
    ]);
  });
});

describe('PATCH /api/v1/tags/:id', () => {
  it('should_rename_the_tag_for_every_transaction_when_the_new_name_is_free', async () => {
    // Arrange
    const tagId = await createTagId('Viagem');
    await insertTaggedTransactions(tagId, 1);
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `${TAGS_URL}/${tagId}`,
      payload: { name: 'Viagem Chile' },
    });
    // Assert
    expect(response.json()).toMatchObject({ name: 'Viagem Chile', transactionCount: 1 });
  });

  it('should_keep_the_tag_name_when_only_its_case_changes', async () => {
    // Arrange
    const tagId = await createTagId('viagem');
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `${TAGS_URL}/${tagId}`,
      payload: { name: 'Viagem' },
    });
    // Assert
    expect(response.json()).toMatchObject({ name: 'Viagem' });
  });

  it('should_answer_409_when_the_new_name_belongs_to_another_tag', async () => {
    // Arrange
    await createTag('Reforma');
    const tagId = await createTagId('Viagem');
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `${TAGS_URL}/${tagId}`,
      payload: { name: 'reforma' },
    });
    // Assert
    expect(response.statusCode).toBe(409);
  });

  it('should_answer_404_when_the_tag_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `${TAGS_URL}/${UNKNOWN_ID}`,
      payload: { name: 'Qualquer' },
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/tags/:id', () => {
  it('should_delete_the_tag_and_keep_the_transactions_when_it_is_in_use', async () => {
    // Arrange
    const tagId = await createTagId('Reforma');
    await insertTaggedTransactions(tagId, 3);
    // Act
    const response = await testApp.app.inject({ method: 'DELETE', url: `${TAGS_URL}/${tagId}` });
    // Assert
    expect({
      statusCode: response.statusCode,
      tags: await database.db.$count(tags),
      links: await database.db.$count(transactionTags),
      transactions: await database.db.$count(transactions),
    }).toEqual({ statusCode: 204, tags: 0, links: 0, transactions: 3 });
  });

  it('should_answer_404_when_the_tag_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `${TAGS_URL}/${UNKNOWN_ID}`,
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});
