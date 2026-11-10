import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { alerts } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertCategory, insertConnection } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const ALERTS_URL = '/api/v1/alerts';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

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

async function insertAlert(overrides: Partial<typeof alerts.$inferInsert> = {}): Promise<string> {
  const [row] = await database.db
    .insert(alerts)
    .values({
      type: 'connection_error',
      message: 'Banco Azul: acesso a refazer.',
      dedupeKey: `connection_error:${crypto.randomUUID()}`,
      ...overrides,
    })
    .returning({ id: alerts.id });
  if (!row) throw new Error('Teste: alerta não foi criado');
  return row.id;
}

async function getAlerts(query = '') {
  const response = await testApp.app.inject({ method: 'GET', url: `${ALERTS_URL}${query}` });
  return response.json();
}

describe('GET /api/v1/alerts', () => {
  it('should_return_the_active_alerts_and_the_unread_count_when_one_of_three_was_read', async () => {
    // Arrange
    await insertAlert({ readAt: new Date() });
    await insertAlert();
    await insertAlert();
    // Act
    const body = await getAlerts();
    // Assert
    expect({ items: body.items.length, unreadCount: body.unreadCount }).toEqual({
      items: 3,
      unreadCount: 2,
    });
  });

  it('should_leave_out_dismissed_and_resolved_alerts_when_listing', async () => {
    // Arrange
    await insertAlert({ dismissedAt: new Date() });
    await insertAlert({ resolvedAt: new Date() });
    const activeId = await insertAlert();
    // Act
    const body = await getAlerts();
    // Assert
    expect(body.items.map((alert: { id: string }) => alert.id)).toEqual([activeId]);
  });

  it('should_return_an_empty_list_when_there_are_no_alerts', async () => {
    // Arrange
    // Act
    const body = await getAlerts();
    // Assert
    expect(body).toEqual({
      items: [],
      unreadCount: 0,
      pagination: { page: 1, limit: 20, total: 0 },
    });
  });

  it('should_list_the_newest_first_when_alerts_have_different_dates', async () => {
    // Arrange
    const oldestId = await insertAlert({ createdAt: new Date('2026-11-01T10:00:00Z') });
    const newestId = await insertAlert({ createdAt: new Date('2026-11-03T10:00:00Z') });
    // Act
    const body = await getAlerts();
    // Assert
    expect(body.items.map((alert: { id: string }) => alert.id)).toEqual([newestId, oldestId]);
  });

  it('should_return_the_budget_screen_target_when_the_alert_is_a_budget_alert', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertAlert({
      type: 'budget_warning',
      categoryId,
      dedupeKey: `budget_warning:${categoryId}:2026-11`,
      message: 'Mercado chegou a 80% do orçamento de novembro',
    });
    // Act
    const body = await getAlerts();
    // Assert
    expect(body.items[0].target).toEqual({ screen: 'budgets', month: '2026-11', categoryId });
  });

  it('should_return_the_accounts_screen_target_when_the_alert_is_a_connection_alert', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db);
    await insertAlert({ connectionId });
    // Act
    const body = await getAlerts();
    // Assert
    expect(body.items[0].target).toEqual({ screen: 'accounts' });
  });

  it('should_not_expose_internal_fields_when_listing', async () => {
    // Arrange
    await insertAlert();
    // Act
    const body = await getAlerts();
    // Assert
    expect(Object.keys(body.items[0]).sort()).toEqual([
      'createdAt',
      'id',
      'message',
      'readAt',
      'target',
      'type',
    ]);
  });

  it('should_paginate_when_there_are_more_alerts_than_the_limit', async () => {
    // Arrange
    await insertAlert({ createdAt: new Date('2026-11-01T10:00:00Z') });
    await insertAlert({ createdAt: new Date('2026-11-02T10:00:00Z') });
    await insertAlert({ createdAt: new Date('2026-11-03T10:00:00Z') });
    // Act
    const body = await getAlerts('?page=2&limit=2');
    // Assert
    expect({
      items: body.items.length,
      pagination: body.pagination,
      unreadCount: body.unreadCount,
    }).toEqual({ items: 1, pagination: { page: 2, limit: 2, total: 3 }, unreadCount: 3 });
  });

  it('should_answer_400_when_the_limit_is_above_the_maximum', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: `${ALERTS_URL}?limit=51` });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/v1/alerts/:id/read', () => {
  it('should_mark_the_alert_as_read_and_keep_it_in_the_list_when_it_is_opened', async () => {
    // Arrange
    const alertId = await insertAlert();
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${alertId}/read`,
    });
    // Assert
    const body = await getAlerts();
    expect({
      status: response.statusCode,
      unreadCount: body.unreadCount,
      items: body.items.length,
    }).toEqual({ status: 204, unreadCount: 0, items: 1 });
  });

  it('should_keep_the_first_read_date_when_marking_as_read_twice', async () => {
    // Arrange
    const alertId = await insertAlert();
    await testApp.app.inject({ method: 'POST', url: `${ALERTS_URL}/${alertId}/read` });
    const firstReadAt = (await getAlerts()).items[0].readAt;
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${alertId}/read`,
    });
    // Assert
    expect({ status: response.statusCode, readAt: (await getAlerts()).items[0].readAt }).toEqual({
      status: 204,
      readAt: firstReadAt,
    });
  });

  it('should_answer_404_when_the_alert_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${MISSING_ID}/read`,
    });
    // Assert
    expect({ status: response.statusCode, code: response.json().error.code }).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('POST /api/v1/alerts/read-all', () => {
  it('should_zero_the_unread_count_and_keep_the_alerts_when_marking_all_as_read', async () => {
    // Arrange
    await insertAlert();
    await insertAlert();
    // Act
    const response = await testApp.app.inject({ method: 'POST', url: `${ALERTS_URL}/read-all` });
    // Assert
    const body = await getAlerts();
    expect({
      status: response.statusCode,
      unreadCount: body.unreadCount,
      items: body.items.length,
    }).toEqual({ status: 204, unreadCount: 0, items: 2 });
  });

  it('should_answer_204_when_there_are_no_alerts', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({ method: 'POST', url: `${ALERTS_URL}/read-all` });
    // Assert
    expect(response.statusCode).toBe(204);
  });
});

describe('POST /api/v1/alerts/:id/dismiss', () => {
  it('should_remove_the_alert_from_the_list_and_the_count_when_dismissed', async () => {
    // Arrange
    const alertId = await insertAlert();
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${alertId}/dismiss`,
    });
    // Assert
    const body = await getAlerts();
    expect({
      status: response.statusCode,
      unreadCount: body.unreadCount,
      items: body.items,
    }).toEqual({ status: 204, unreadCount: 0, items: [] });
  });

  it('should_answer_204_when_dismissing_the_same_alert_twice', async () => {
    // Arrange
    const alertId = await insertAlert();
    await testApp.app.inject({ method: 'POST', url: `${ALERTS_URL}/${alertId}/dismiss` });
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${alertId}/dismiss`,
    });
    // Assert
    expect(response.statusCode).toBe(204);
  });

  it('should_answer_404_when_the_alert_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/${MISSING_ID}/dismiss`,
    });
    // Assert
    expect({ status: response.statusCode, code: response.json().error.code }).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('should_answer_400_when_the_id_is_not_a_uuid', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: `${ALERTS_URL}/not-a-uuid/dismiss`,
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});
