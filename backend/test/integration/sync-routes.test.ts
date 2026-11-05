import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncRuns } from '../../src/db/schema.js';
import {
  buildSyncHarness,
  fixtureOf,
  latestRunOf,
  runSync,
  startRun,
  type SyncHarness,
  waitForRunToFinish,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const SYNC_RUNS_URL = '/api/v1/sync-runs';
const LATEST_RUN_URL = '/api/v1/sync-runs/latest';
const CONNECTIONS_URL = '/api/v1/connections';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  await harness.app.close();
});

describe('POST /api/v1/sync-runs', () => {
  it('should_answer_202_with_a_running_manual_run_when_no_sync_is_in_progress', async () => {
    // Arrange
    const { app } = harness;
    // Act
    const response = await app.inject({ method: 'POST', url: SYNC_RUNS_URL });
    await waitForRunToFinish(harness.syncService);
    // Assert
    expect({ statusCode: response.statusCode, body: response.json() }).toMatchObject({
      statusCode: 202,
      body: { status: 'running', trigger: 'manual', finishedAt: null, stats: null },
    });
  });

  it('should_answer_409_sync_in_progress_when_a_sync_is_already_running', async () => {
    // Arrange
    const release = harness.sdk.holdFetchItem();
    const running = await startRun(harness.syncService);
    // Act
    const response = await harness.app.inject({ method: 'POST', url: SYNC_RUNS_URL });
    release();
    await running.finished;
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'SYNC_IN_PROGRESS',
    });
  });

  it('should_skip_the_scheduled_sync_without_a_new_run_when_a_manual_sync_is_running', async () => {
    // Arrange
    const release = harness.sdk.holdFetchItem();
    const running = await startRun(harness.syncService);
    // Act
    await harness.syncService.runScheduled();
    release();
    await running.finished;
    // Assert
    expect(await harness.database.db.$count(syncRuns)).toBe(1);
  });
});

describe('GET /api/v1/sync-runs/latest', () => {
  it('should_answer_404_not_found_when_no_sync_ever_ran', async () => {
    // Arrange
    const { app } = harness;
    // Act
    const response = await app.inject({ method: 'GET', url: LATEST_RUN_URL });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('should_return_the_finished_run_with_stats_when_a_sync_ended', async () => {
    // Arrange
    await runSync(harness.syncService);
    // Act
    const response = await harness.app.inject({ method: 'GET', url: LATEST_RUN_URL });
    // Assert
    expect(response.json()).toMatchObject({
      status: 'success',
      finishedAt: expect.any(String),
      stats: { transactionsInserted: expect.any(Number) },
      errorMessage: null,
    });
  });

  it('should_record_schedule_as_trigger_when_the_daily_schedule_runs', async () => {
    // Arrange
    const { syncService } = harness;
    // Act
    await syncService.runScheduled();
    // Assert
    expect((await latestRunOf(syncService)).trigger).toBe('schedule');
  });
});

describe('GET /api/v1/connections', () => {
  it('should_list_every_connection_with_status_and_message_when_one_bank_has_an_error', async () => {
    // Arrange
    fixtureOf(harness.fixtures, 'item-1').item.status = 'LOGIN_ERROR';
    await runSync(harness.syncService);
    // Act
    const response = await harness.app.inject({ method: 'GET', url: CONNECTIONS_URL });
    // Assert
    expect(response.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'error',
          statusDetail: 'O acesso a este banco precisa ser refeito no Meu Pluggy.',
          lastSyncedAt: null,
        }),
        expect.objectContaining({ institutionName: 'Banco B', status: 'ok', statusDetail: null }),
        expect.objectContaining({ institutionName: 'Banco C', status: 'ok' }),
      ]),
    );
  });

  it('should_return_an_empty_list_when_no_bank_was_synced_yet', async () => {
    // Arrange
    const { app } = harness;
    // Act
    const response = await app.inject({ method: 'GET', url: CONNECTIONS_URL });
    // Assert
    expect(response.json()).toEqual({ items: [] });
  });
});

describe('logs da sincronização', () => {
  it('should_not_log_values_descriptions_or_credentials_when_a_sync_runs', async () => {
    // Arrange
    fixtureOf(harness.fixtures, 'item-3').item.status = 'OUTDATED';
    // Act
    await runSync(harness.syncService);
    // Assert
    const serializedLogs = JSON.stringify(harness.logLines);
    expect(serializedLogs).not.toMatch(
      /Mercado Exemplo|Farmácia|Pix recebido|Banco B|amount|description|test-client-secret|item-\d/,
    );
  });
});
