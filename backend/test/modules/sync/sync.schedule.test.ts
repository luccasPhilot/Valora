import type { Cron } from 'croner';
import { afterEach, describe, expect, it } from 'vitest';

import type { HeartbeatResult } from '../../../src/modules/sync/healthcheck-pinger.js';
import {
  type Deferrer,
  recoverMissedSync,
  type ScheduledSync,
  startSyncSchedule,
  SYNC_RETRY_DELAY_HOURS,
} from '../../../src/modules/sync/sync.schedule.js';
import type {
  ScheduledSyncReport,
  ScheduledSyncResult,
  SyncLogger,
} from '../../../src/modules/sync/sync.service.js';

const PATTERN = '0 7 * * *';
const MS_PER_HOUR = 3_600_000;
// 10:00 UTC = 07:00 em São Paulo (UTC-3).
const AT_7_IN_SAO_PAULO = new Date('2026-11-04T10:00:00Z');

const SILENT_LOGGER: SyncLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function report(result: ScheduledSyncResult, pendingItemCount = 0): ScheduledSyncReport {
  return { result, pendingItemCount };
}

/** Sincronização falsa: devolve os relatórios na ordem pedida e conta as chamadas. */
class CountingSync implements ScheduledSync {
  scheduledRuns = 0;
  catchUps = 0;

  constructor(
    private readonly scheduledReport: ScheduledSyncReport = report('success'),
    private readonly catchUpReport: ScheduledSyncReport = report('success'),
  ) {}

  async runScheduled(): Promise<ScheduledSyncReport> {
    this.scheduledRuns += 1;
    return this.scheduledReport;
  }

  async catchUpToday(): Promise<ScheduledSyncReport> {
    this.catchUps += 1;
    return this.catchUpReport;
  }
}

class RecordingHeartbeat {
  readonly reports: HeartbeatResult[] = [];

  async report(result: HeartbeatResult): Promise<void> {
    this.reports.push(result);
  }
}

/** Adiador falso: guarda as tarefas para o teste rodar quando quiser, sem esperar 3 horas. */
class ManualDeferrer {
  readonly delays: number[] = [];
  private readonly tasks: (() => void)[] = [];

  readonly defer: Deferrer = (task, delayMs) => {
    this.delays.push(delayMs);
    this.tasks.push(task);
  };

  /** Roda as tarefas guardadas e espera o que elas dispararam terminar. */
  async runPending(): Promise<void> {
    for (const task of this.tasks.splice(0)) task();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('startSyncSchedule', () => {
  let schedule: Cron | undefined;

  afterEach(() => {
    schedule?.stop();
  });

  interface ScheduleSetup {
    readonly sync?: ScheduledSync;
    readonly heartbeat?: RecordingHeartbeat;
    readonly deferrer?: ManualDeferrer;
    readonly now?: Date;
  }

  function scheduleWith({ sync, heartbeat, deferrer, now }: ScheduleSetup = {}): Cron {
    schedule = startSyncSchedule({
      pattern: PATTERN,
      sync: sync ?? new CountingSync(),
      logger: SILENT_LOGGER,
      heartbeat: heartbeat ?? new RecordingHeartbeat(),
      defer: (deferrer ?? new ManualDeferrer()).defer,
      now: () => now ?? AT_7_IN_SAO_PAULO,
    });
    return schedule;
  }

  it('should_fire_at_7_in_sao_paulo_when_pattern_is_the_default', () => {
    // Arrange: 09:00 UTC = 06:00 em São Paulo (UTC-3).
    const cron = scheduleWith();
    // Act
    const nextRun = cron.nextRun(new Date('2026-11-04T09:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-04T10:00:00Z'));
  });

  it('should_fire_next_day_when_7_in_sao_paulo_already_passed', () => {
    // Arrange: 11:00 UTC = 08:00 em São Paulo.
    const cron = scheduleWith();
    // Act
    const nextRun = cron.nextRun(new Date('2026-11-04T11:00:00Z'));
    // Assert
    expect(nextRun).toEqual(new Date('2026-11-05T10:00:00Z'));
  });

  it('should_run_the_scheduled_sync_when_the_schedule_fires', async () => {
    // Arrange
    const sync = new CountingSync();
    const cron = scheduleWith({ sync });
    // Act
    await cron.trigger();
    // Assert
    expect(sync.scheduledRuns).toBe(1);
  });

  it('should_report_success_when_the_scheduled_sync_succeeds', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith({ sync: new CountingSync(report('success')), heartbeat });
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['success']);
  });

  it('should_report_fail_when_the_scheduled_sync_is_partial', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith({ sync: new CountingSync(report('partial', 1)), heartbeat });
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['fail']);
  });

  it('should_report_fail_when_the_scheduled_sync_fails', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith({ sync: new CountingSync(report('failed', 3)), heartbeat });
    // Act
    await cron.trigger();
    // Assert
    expect(heartbeat.reports).toEqual(['fail']);
  });

  it('should_not_report_when_the_scheduled_sync_is_skipped', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const cron = scheduleWith({ sync: new CountingSync(report('skipped')), heartbeat });
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
    const sync: ScheduledSync = {
      runScheduled: () => Promise.reject(new TypeError('db down')),
      catchUpToday: () => Promise.reject(new TypeError('db down')),
    };
    schedule = startSyncSchedule({ pattern: PATTERN, sync, logger, heartbeat });
    // Act
    await schedule.trigger();
    // Assert
    expect({ reports: heartbeat.reports, loggedErrors }).toEqual({
      reports: ['fail'],
      loggedErrors: [{ errorType: 'TypeError' }],
    });
  });

  it('should_plan_a_retry_3_hours_later_when_a_bank_is_still_pending', async () => {
    // Arrange
    const deferrer = new ManualDeferrer();
    const cron = scheduleWith({ sync: new CountingSync(report('partial', 1)), deferrer });
    // Act
    await cron.trigger();
    // Assert
    expect(deferrer.delays).toEqual([SYNC_RETRY_DELAY_HOURS * MS_PER_HOUR]);
  });

  it('should_catch_up_only_the_pending_banks_when_the_retry_fires', async () => {
    // Arrange
    const deferrer = new ManualDeferrer();
    const sync = new CountingSync(report('partial', 1));
    const cron = scheduleWith({ sync, deferrer });
    await cron.trigger();
    // Act
    await deferrer.runPending();
    // Assert
    expect({ scheduledRuns: sync.scheduledRuns, catchUps: sync.catchUps }).toEqual({
      scheduledRuns: 1,
      catchUps: 1,
    });
  });

  it('should_not_plan_a_retry_when_every_bank_synced', async () => {
    // Arrange
    const deferrer = new ManualDeferrer();
    const cron = scheduleWith({ sync: new CountingSync(report('success', 0)), deferrer });
    // Act
    await cron.trigger();
    // Assert
    expect(deferrer.delays).toEqual([]);
  });

  it('should_not_plan_another_retry_when_the_retry_still_leaves_a_bank_pending', async () => {
    // Arrange
    const deferrer = new ManualDeferrer();
    const sync = new CountingSync(report('partial', 1), report('partial', 1));
    const cron = scheduleWith({ sync, deferrer });
    await cron.trigger();
    // Act
    await deferrer.runPending();
    // Assert
    expect(deferrer.delays).toHaveLength(1);
  });

  it('should_not_plan_a_retry_when_it_would_fall_after_midnight_in_sao_paulo', async () => {
    // Arrange: 01:00 UTC de 05/11 = 22:00 de 04/11 em São Paulo; 3 horas depois já é dia 05.
    const deferrer = new ManualDeferrer();
    const cron = scheduleWith({
      sync: new CountingSync(report('partial', 1)),
      deferrer,
      now: new Date('2026-11-05T01:00:00Z'),
    });
    // Act
    await cron.trigger();
    // Assert
    expect(deferrer.delays).toEqual([]);
  });

  it('should_report_the_retry_result_to_the_heartbeat', async () => {
    // Arrange
    const deferrer = new ManualDeferrer();
    const heartbeat = new RecordingHeartbeat();
    const sync = new CountingSync(report('partial', 1), report('success'));
    const cron = scheduleWith({ sync, deferrer, heartbeat });
    await cron.trigger();
    // Act
    await deferrer.runPending();
    // Assert
    expect(heartbeat.reports).toEqual(['fail', 'success']);
  });
});

describe('recoverMissedSync', () => {
  function recoverAt(now: Date, setup: { sync: ScheduledSync; heartbeat?: RecordingHeartbeat }) {
    return recoverMissedSync({
      pattern: PATTERN,
      sync: setup.sync,
      logger: SILENT_LOGGER,
      heartbeat: setup.heartbeat ?? new RecordingHeartbeat(),
      defer: new ManualDeferrer().defer,
      now: () => now,
    });
  }

  it('should_catch_up_when_the_api_starts_after_the_schedule_time', async () => {
    // Arrange: 12:30 UTC = 09:30 em São Paulo.
    const sync = new CountingSync();
    // Act
    await recoverAt(new Date('2026-11-04T12:30:00Z'), { sync });
    // Assert
    expect(sync.catchUps).toBe(1);
  });

  it('should_not_catch_up_when_the_api_starts_before_the_schedule_time', async () => {
    // Arrange: 09:00 UTC = 06:00 em São Paulo.
    const sync = new CountingSync();
    // Act
    await recoverAt(new Date('2026-11-04T09:00:00Z'), { sync });
    // Assert
    expect(sync.catchUps).toBe(0);
  });

  it('should_report_the_catch_up_result_to_the_heartbeat', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const sync = new CountingSync(report('success'), report('partial', 1));
    // Act
    await recoverAt(new Date('2026-11-04T12:30:00Z'), { sync, heartbeat });
    // Assert
    expect(heartbeat.reports).toEqual(['fail']);
  });

  it('should_not_report_when_every_bank_already_synced_today', async () => {
    // Arrange
    const heartbeat = new RecordingHeartbeat();
    const sync = new CountingSync(report('success'), report('nothing_due'));
    // Act
    await recoverAt(new Date('2026-11-04T12:30:00Z'), { sync, heartbeat });
    // Assert
    expect(heartbeat.reports).toEqual([]);
  });

  it('should_resolve_and_log_the_error_type_when_the_catch_up_cannot_start', async () => {
    // Arrange
    const loggedErrors: Record<string, unknown>[] = [];
    const sync: ScheduledSync = {
      runScheduled: () => Promise.reject(new TypeError('db down')),
      catchUpToday: () => Promise.reject(new TypeError('db down')),
    };
    // Act
    await recoverMissedSync({
      pattern: PATTERN,
      sync,
      logger: { ...SILENT_LOGGER, error: (fields) => loggedErrors.push(fields) },
      heartbeat: new RecordingHeartbeat(),
      now: () => new Date('2026-11-04T12:30:00Z'),
    });
    // Assert
    expect(loggedErrors).toEqual([{ errorType: 'TypeError' }]);
  });
});
