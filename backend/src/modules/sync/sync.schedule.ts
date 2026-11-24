import { Cron } from 'croner';

import { APP_TIMEZONE } from '../../shared/timezone.js';
import type { HealthcheckPinger, HeartbeatResult } from './healthcheck-pinger.js';
import type { ScheduledSyncResult, SyncLogger } from './sync.service.js';

export interface ScheduledSync {
  runScheduled(): Promise<ScheduledSyncResult>;
}

export interface SyncScheduleOptions {
  /** Padrão cron, lido no fuso de São Paulo (ex.: '0 7 * * *' = todo dia às 07:00). */
  readonly pattern: string;
  readonly sync: ScheduledSync;
  readonly logger: SyncLogger;
  /** Aviso ao healthchecks.io no fim de cada disparo (só o agendamento avisa, nunca o botão). */
  readonly heartbeat: Pick<HealthcheckPinger, 'report'>;
}

/**
 * `partial` também é falha: um banco com consentimento vencido deixa de trazer transações e de
 * gravar a foto do dia. `skipped` não avisa: outra sincronização já estava rodando.
 */
export function heartbeatFor(result: ScheduledSyncResult): HeartbeatResult | null {
  switch (result) {
    case 'success':
      return 'success';
    case 'partial':
    case 'failed':
      return 'fail';
    case 'skipped':
      return null;
  }
}

async function runAndReport(
  sync: ScheduledSync,
  heartbeat: SyncScheduleOptions['heartbeat'],
): Promise<void> {
  let result: ScheduledSyncResult;
  try {
    result = await sync.runScheduled();
  } catch (error) {
    // A sincronização nem começou (ex.: banco de dados fora do ar).
    await heartbeat.report('fail');
    throw error;
  }
  const heartbeatResult = heartbeatFor(result);
  if (heartbeatResult !== null) await heartbeat.report(heartbeatResult);
}

export function startSyncSchedule({ pattern, sync, logger, heartbeat }: SyncScheduleOptions): Cron {
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
    () => runAndReport(sync, heartbeat),
  );
}
