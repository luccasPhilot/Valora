import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, connections, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertConnection, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const REMOVED_MESSAGE = 'Este banco foi removido do Meu Pluggy. Remova-o do Valora.';

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

async function patchArchived(connectionId: string, isArchived: boolean) {
  const response = await testApp.app.inject({
    method: 'PATCH',
    url: `/api/v1/connections/${connectionId}`,
    payload: { isArchived },
  });
  return { statusCode: response.statusCode, body: response.json() };
}

async function getConnections(query = '') {
  const response = await testApp.app.inject({ method: 'GET', url: `/api/v1/connections${query}` });
  return response.json();
}

// `item-1`, `item-2` e `item-3` estão no PLUGGY_ITEM_IDS do app de teste; `item-removed` não.
async function bankWithAccountAndTransactions(pluggyItemId = 'item-1') {
  const connectionId = await insertConnection(database.db, {
    pluggyItemId,
    institutionName: 'Conta Corrente',
  });
  const accountId = await insertAccountWith(database.db, {
    connectionId,
    type: 'checking',
    balanceCents: 300000,
  });
  await database.db.insert(transactions).values(transactionValues(accountId));
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { amountCents: -500 }));
  return { connectionId, accountId };
}

describe('PATCH /api/v1/connections/:id', () => {
  it('should_archive_the_bank_and_keep_its_accounts_and_transactions', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    // Act
    await patchArchived(connectionId, true);
    // Assert
    expect({
      accounts: await database.db.$count(accounts),
      transactions: await database.db.$count(transactions),
    }).toEqual({ accounts: 1, transactions: 2 });
  });

  it('should_return_the_archived_connection_with_the_archive_date_and_its_accounts', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    // Act
    const { statusCode, body } = await patchArchived(connectionId, true);
    // Assert
    expect({
      statusCode,
      isArchived: body.archivedAt !== null,
      accountCount: body.accounts.length,
    }).toEqual({ statusCode: 200, isArchived: true, accountCount: 1 });
  });

  it('should_keep_the_first_archive_date_when_archiving_again', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    const first = await patchArchived(connectionId, true);
    // Act
    const second = await patchArchived(connectionId, true);
    // Assert
    expect(second.body.archivedAt).toBe(first.body.archivedAt);
  });

  it('should_clear_the_archive_date_when_reactivating', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    await patchArchived(connectionId, true);
    // Act
    const { body } = await patchArchived(connectionId, false);
    // Assert
    expect(body.archivedAt).toBeNull();
  });

  it('should_answer_not_found_when_the_connection_does_not_exist', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await patchArchived(UNKNOWN_ID, true);
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('should_archive_a_healthy_bank', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    // Act
    const { statusCode } = await patchArchived(connectionId, true);
    // Assert
    expect(statusCode).toBe(200);
  });

  it('should_reject_a_body_without_is_archived', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions();
    // Act
    const response = await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connectionId}`,
      payload: {},
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/connections', () => {
  it('should_list_only_active_banks_by_default', async () => {
    // Arrange
    await bankWithAccountAndTransactions('item-1');
    const archived = await bankWithAccountAndTransactions('item-2');
    await patchArchived(archived.connectionId, true);
    // Act
    const body = await getConnections();
    // Assert
    expect(body.items).toHaveLength(1);
  });

  it('should_list_only_archived_banks_with_their_accounts_when_archived_is_true', async () => {
    // Arrange
    await bankWithAccountAndTransactions('item-1');
    const archived = await bankWithAccountAndTransactions('item-2');
    await patchArchived(archived.connectionId, true);
    // Act
    const body = await getConnections('?archived=true');
    // Assert
    expect(
      body.items.map((item: { id: string; accounts: unknown[] }) => [
        item.id,
        item.accounts.length,
      ]),
    ).toEqual([[archived.connectionId, 1]]);
  });

  it('should_mark_is_configured_false_when_the_item_id_is_not_in_the_configured_list', async () => {
    // Arrange
    await bankWithAccountAndTransactions('item-removed');
    // Act
    const body = await getConnections();
    // Assert
    expect(body.items[0].isConfigured).toBe(false);
  });

  it('should_mark_is_configured_true_when_the_item_id_is_in_the_configured_list', async () => {
    // Arrange
    await bankWithAccountAndTransactions('item-1');
    // Act
    const body = await getConnections();
    // Assert
    expect(body.items[0].isConfigured).toBe(true);
  });

  it('should_not_expose_the_pluggy_item_id', async () => {
    // Arrange
    await bankWithAccountAndTransactions('item-1');
    // Act
    const body = await getConnections();
    // Assert
    expect(JSON.stringify(body)).not.toContain('item-1');
  });

  it('should_show_the_item_not_found_status_and_message', async () => {
    // Arrange
    const { connectionId } = await bankWithAccountAndTransactions('item-1');
    await database.db
      .update(connections)
      .set({ status: 'item_not_found', statusDetail: REMOVED_MESSAGE })
      .where(eq(connections.id, connectionId));
    // Act
    const body = await getConnections();
    // Assert
    expect(body.items[0]).toMatchObject({
      status: 'item_not_found',
      statusDetail: REMOVED_MESSAGE,
    });
  });
});
