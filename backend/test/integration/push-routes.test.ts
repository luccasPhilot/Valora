import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX } from '../../src/app.js';
import { pushSubscriptions } from '../../src/db/schema.js';
import { FakePushSender, TEST_VAPID } from '../helpers/fake-push-sender.js';
import { buildTestApp, TEST_CONFIG, type TestApp } from '../helpers/test-app.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const ENDPOINT_ONE = 'https://push.exemplo.test/send/aparelho-1-segredo';
const ENDPOINT_TWO = 'https://push.exemplo.test/send/aparelho-2-segredo';
const SUBSCRIPTION_KEYS = { p256dh: 'chave-p256dh', auth: 'chave-auth' };

let database: ReturnType<typeof connectTestDatabase>;
let sender: FakePushSender;
let testApp: TestApp;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  sender = new FakePushSender();
  testApp = buildTestApp(database, {
    config: { ...TEST_CONFIG, vapid: TEST_VAPID },
    pushSender: sender,
  });
});

afterEach(async () => {
  await testApp.app.close();
});

function subscribe(endpoint: string, keys = SUBSCRIPTION_KEYS) {
  return testApp.app.inject({
    method: 'POST',
    url: `${API_PREFIX}/push/subscriptions`,
    payload: { endpoint, keys },
  });
}

describe('GET /push/public-key', () => {
  it('should_return_the_public_key_when_push_is_on', async () => {
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${API_PREFIX}/push/public-key`,
    });
    // Assert
    expect(response.json()).toEqual({ publicKey: TEST_VAPID.publicKey });
  });

  it('should_answer_404_push_disabled_when_there_are_no_vapid_keys', async () => {
    // Arrange
    const offApp = buildTestApp();
    // Act
    const response = await offApp.app.inject({
      method: 'GET',
      url: `${API_PREFIX}/push/public-key`,
    });
    await offApp.app.close();
    // Assert
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('PUSH_DISABLED');
  });
});

describe('POST /push/subscriptions', () => {
  it('should_store_one_row_when_the_same_device_subscribes_twice', async () => {
    // Arrange
    await subscribe(ENDPOINT_ONE);
    // Act
    await subscribe(ENDPOINT_ONE, { p256dh: 'chave-nova', auth: 'auth-novo' });
    // Assert
    const rows = await database.db.select().from(pushSubscriptions);
    expect(rows.map((row) => row.p256dh)).toEqual(['chave-nova']);
  });

  it('should_store_two_rows_when_two_devices_subscribe', async () => {
    // Arrange
    await subscribe(ENDPOINT_ONE);
    // Act
    await subscribe(ENDPOINT_TWO);
    // Assert
    expect(await database.db.$count(pushSubscriptions)).toBe(2);
  });

  it('should_refuse_with_400_when_the_endpoint_is_not_https', async () => {
    // Act
    const response = await subscribe('http://push.exemplo.test/send/inseguro');
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_refuse_with_400_when_the_keys_are_missing', async () => {
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${API_PREFIX}/push/subscriptions`,
      payload: { endpoint: ENDPOINT_ONE },
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_never_log_the_endpoint_when_subscribing_and_unsubscribing', async () => {
    // Arrange
    await subscribe(ENDPOINT_ONE);
    // Act
    await testApp.app.inject({
      method: 'DELETE',
      url: `${API_PREFIX}/push/subscriptions`,
      payload: { endpoint: ENDPOINT_ONE },
    });
    // Assert
    expect(JSON.stringify(testApp.logLines)).not.toContain('aparelho-1-segredo');
  });
});

describe('DELETE /push/subscriptions', () => {
  it('should_answer_204_and_remove_the_row_when_the_subscription_exists', async () => {
    // Arrange
    await subscribe(ENDPOINT_ONE);
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `${API_PREFIX}/push/subscriptions`,
      payload: { endpoint: ENDPOINT_ONE },
    });
    // Assert
    expect(response.statusCode).toBe(204);
    expect(await database.db.$count(pushSubscriptions)).toBe(0);
  });

  it('should_answer_204_when_the_subscription_does_not_exist', async () => {
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `${API_PREFIX}/push/subscriptions`,
      payload: { endpoint: ENDPOINT_TWO },
    });
    // Assert
    expect(response.statusCode).toBe(204);
  });
});

describe('POST /push/test', () => {
  it('should_send_the_test_text_to_every_subscription', async () => {
    // Arrange
    await subscribe(ENDPOINT_ONE);
    await subscribe(ENDPOINT_TWO);
    // Act
    const response = await testApp.app.inject({ method: 'POST', url: `${API_PREFIX}/push/test` });
    // Assert
    expect(response.statusCode).toBe(204);
    expect(sender.sent.map(({ endpoint }) => endpoint).sort()).toEqual([
      ENDPOINT_ONE,
      ENDPOINT_TWO,
    ]);
    expect(sender.bodies()).toEqual([
      'Notificações do Valora ativadas',
      'Notificações do Valora ativadas',
    ]);
  });

  it('should_answer_404_when_push_is_off', async () => {
    // Arrange
    const offApp = buildTestApp();
    // Act
    const response = await offApp.app.inject({ method: 'POST', url: `${API_PREFIX}/push/test` });
    await offApp.app.close();
    // Assert
    expect(response.statusCode).toBe(404);
  });
});
