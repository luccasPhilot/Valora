import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount } from './fixtures.js';
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

describe('GET /api/v1/accounts', () => {
  it('should_list_the_accounts_with_name_type_and_institution_when_they_exist', async () => {
    // Arrange
    const accountId = await insertAccount(database.db);
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/accounts' });
    // Assert
    expect(response.json().items).toEqual([
      {
        id: accountId,
        name: 'Conta corrente',
        type: 'checking',
        institutionName: 'Banco de teste',
      },
    ]);
  });
});
