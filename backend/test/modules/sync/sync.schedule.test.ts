import type { Cron } from 'croner';
import { afterEach, describe, expect, it } from 'vitest';

import type { HeartbeatResult } from '../../../src/modules/sync/healthcheck-pinger.js';
import { type ScheduledSync, startSyncSchedule } from '../../../src/modules/sync/sync.schedule.js';
import type { ScheduledSyncResult, SyncLogger } from '../../../src/modules/sync/sync.service.js';

const SILENT_LOGGER: SyncLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

class CountingSync implements ScheduledSync {
  runs = 0;

  constructor(private readonly result: ScheduledSyncResult = 'success') {}

  async runScheduled(): Promise<ScheduledSyncResult> {
    this.runs += 1;
    return this.result;
  }
}

class RecordingHeartbeat {
  readonly reports: HeartbeatResult[] = [];

  async report(result: HeartbeatResult): Promise<void> {
    this.reports.push(result);
  }
}

describe('startSyncSchedule', () => {
  let schedule: Cron | undefined;

  afterEach(() => {
    schedule?.stop();
  });

  function scheduleWith(sync: ScheduledSync, heartbeat = new RecordingHeartbeat()): Cron {
    schedule = startSyncSchedule({ pattern: '0 7 * * *', sync, logger: SILENT_LOGGER, heartbeat });
    return schedule;
  }

  it('should_fire_at_7_in_sao_paulo_when_pattern_is_the_default', () => {
    // Arrange: 09:00 UTC = 06:00 em São Paulo (UTC-3).
    const cron = scheduleWith(new CountingSync());
    // Act
    const nextRun = cron.nextRun(new Date('2026-11-04T09:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-04T10:00:00Z'));
  });

  it('should_fire_next_day_when_7_in_sao_paulo_already_passed', () => {
    // Arrange: 11:00 UTC = 08:00 em São Paulo.
    const cron = scheduleWith(new CountingSync());
    // Act
    const nextRun = cron.nextRun(new Date('2026-11-04T11:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-05T10:00:00Z'));
  });

  it('should_run_the_scheduled_sync_when_the_schedule_fires', async () => {
    // Arrange
    const sync = new CountingSync();
    const cron = scheduleWith(sync);
    // Act
    await cron.trigger();
    // Assert
    expect(sync.runs).toBe(1);
  });

  it('should_report_success_when_the_scheduled_sync_succeeds', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith(new CountingSync('success'), heartbeat);
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['success']);
  });

  it('should_report_fail_when_the_scheduled_sync_is_partial', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith(new CountingSync('partial'), heartbeat);
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['fail']);
  });

  it('should_report_fail_when_the_scheduled_sync_fails', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith(new CountingSync('failed'), heartbeat);
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['fail']);
  });

  it('should_not_report_when_the_scheduled_sync_is_skipped', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith(new CountingSync('skipped'), heartbeat);
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual([]);
  });

  it('should_report_fail_and_rethrow_when_scheduled_sync_cannot_start', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const loggedErrors: Record<string, unknown>[] = [];
    const logger: SyncLogger = { ...SILENT_LOGGER, error: (fields) => loggedErrors.push(fields) };
    const sync: ScheduledSync = { runScheduled: () => Promise.reject(new TypeError('db down')) };
    schedule = startSyncSchedule({ pattern: '0 7 * * *', sync, logger, heartbeat });
    // Act
    await schedule.trigger();
    // Assert
    expect({ reports: heartbeat.reports, loggedErrors }).toEqual({
      reports: ['fail'],
      loggedErrors: [{ errorType: 'TypeError' }],
    });
  });
});
