import { describe, expect, it } from 'vitest';

import { createDatabase } from '../../src/db/database.js';
import { buildTestApp } from '../helpers/test-app.js';
import { connectTestDatabase } from './test-database.js';

const API_HEALTH_URL = '/api/v1/health';

describe('GET /api/v1/health', () => {
  it('should_answer_200_when_database_is_reachable', async () => {
    // Arrange
    const { app } = buildTestApp(connectTestDatabase());
    // Act
    const response = await app.inject({ method: 'GET', url: API_HEALTH_URL });
    await app.close();
    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'ok' });
  });

  it('should_answer_503_when_database_is_down', async () => {
    // Arrange
    const unreachableDatabase = createDatabase('postgres://valora:valora@127.0.0.1:1/valora');
    const { app } = buildTestApp(unreachableDatabase);
    // Act
    const response = await app.inject({ method: 'GET', url: API_HEALTH_URL });
    await app.close();
    // Assert
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degraded', database: 'unavailable' });
  });
});
