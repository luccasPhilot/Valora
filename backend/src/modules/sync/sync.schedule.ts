import { Cron } from 'croner';

import { APP_TIMEZONE } from '../../shared/timezone.js';
import type { SyncLogger } from './sync.service.js';

export interface ScheduledSync {
  runScheduled(): Promise<void>;
}

export interface SyncScheduleOptions {
  /** Padrão cron, lido no fuso de São Paulo (ex.: '0 7 * * *' = todo dia às 07:00). */
  readonly pattern: string;
  readonly sync: ScheduledSync;
  readonly logger: SyncLogger;
}

export function startSyncSchedule({ pattern, sync, logger }: SyncScheduleOptions): Cron {
  return new Cron(
    pattern,
    {
      name: 'daily-sync',
      timezone: APP_TIMEZONE,
      // Se o disparo anterior ainda estiver rodando, este não começa.
      protect: true,
      catch: (error: unknown) => {
        const errorType = error instanceof Error ? error.name : 'unknown';
        logger.error({ errorType }, 'scheduled sync could not start');
      },
    },
    () => sync.runScheduled(),
  );
}
