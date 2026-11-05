import type { Cron } from 'croner';
import { afterEach, describe, expect, it } from 'vitest';

import { type ScheduledSync, startSyncSchedule } from '../../../src/modules/sync/sync.schedule.js';
import type { SyncLogger } from '../../../src/modules/sync/sync.service.js';

const SILENT_LOGGER: SyncLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

class CountingSync implements ScheduledSync {
  runs = 0;

  async runScheduled(): Promise<void> {
    this.runs += 1;
  }
}

describe('startSyncSchedule', () => {
  let schedule: Cron | undefined;

  afterEach(() => {
    schedule?.stop();
  });

  it('should_fire_at_7_in_sao_paulo_when_pattern_is_the_default', () => {
    // Arrange: 09:00 UTC = 06:00 em São Paulo (UTC-3).
    schedule = startSyncSchedule({
      pattern: '0 7 * * *',
      sync: new CountingSync(),
      logger: SILENT_LOGGER,
    });
    // Act
    const nextRun = schedule.nextRun(new Date('2026-11-04T09:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-04T10:00:00Z'));
  });

  it('should_fire_next_day_when_7_in_sao_paulo_already_passed', () => {
    // Arrange: 11:00 UTC = 08:00 em São Paulo.
    schedule = startSyncSchedule({
      pattern: '0 7 * * *',
      sync: new CountingSync(),
      logger: SILENT_LOGGER,
    });
    // Act
    const nextRun = schedule.nextRun(new Date('2026-11-04T11:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-05T10:00:00Z'));
  });

  it('should_run_the_scheduled_sync_when_the_schedule_fires', async () => {
    // Arrange
    const sync = new CountingSync();
    schedule = startSyncSchedule({ pattern: '0 7 * * *', sync, logger: SILENT_LOGGER });
    // Act
    await schedule.trigger();
    // Assert
    expect(sync.runs).toBe(1);
  });
});
