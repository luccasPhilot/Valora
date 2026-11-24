import { Cron } from 'croner';

import { toSaoPauloDate } from '../../shared/dates.js';
import { APP_TIMEZONE } from '../../shared/timezone.js';
import type { HealthcheckPinger, HeartbeatResult } from './healthcheck-pinger.js';
import type { ScheduledSyncReport, ScheduledSyncResult, SyncLogger } from './sync.service.js';

/** A segunda tentativa do dia, contada do fim da execução agendada que deixou banco sem sincronizar. */
export const SYNC_RETRY_DELAY_HOURS = 3;
const MS_PER_HOUR = 3_600_000;

export interface ScheduledSync {
  runScheduled(): Promise<ScheduledSyncReport>;
  catchUpToday(): Promise<ScheduledSyncReport>;
}

/** Adia uma tarefa. Em produção, `setTimeout` com `unref`: o timer não segura o processo aberto. */
export type Deferrer = (task: () => void, delayMs: number) => void;

const deferWithTimer: Deferrer = (task, delayMs) => {
  setTimeout(task, delayMs).unref();
};

export interface SyncScheduleOptions {
  /** Padrão cron, lido no fuso de São Paulo (ex.: '0 7 * * *' = todo dia às 07:00). */
  readonly pattern: string;
  readonly sync: ScheduledSync;
  readonly logger: SyncLogger;
  /** Aviso ao healthchecks.io no fim de cada disparo (só o agendamento avisa, nunca o botão). */
  readonly heartbeat: Pick<HealthcheckPinger, 'report'>;
  readonly now?: () => Date;
  readonly defer?: Deferrer;
}

interface ScheduleContext {
  readonly sync: ScheduledSync;
  readonly logger: SyncLogger;
  readonly heartbeat: Pick<HealthcheckPinger, 'report'>;
  readonly now: () => Date;
  readonly defer: Deferrer;
}

function contextOf(options: SyncScheduleOptions): ScheduleContext {
  return {
    sync: options.sync,
    logger: options.logger,
    heartbeat: options.heartbeat,
    now: options.now ?? (() => new Date()),
    defer: options.defer ?? deferWithTimer,
  };
}

/**
 * `partial` também é falha: um banco com consentimento vencido deixa de trazer transações e de
 * gravar a foto do dia. `skipped` e `nothing_due` não avisam: nenhuma execução nova rodou.
 */
export function heartbeatFor(result: ScheduledSyncResult): HeartbeatResult | null {
  switch (result) {
    case 'success':
      return 'success';
    case 'partial':
    case 'failed':
      return 'fail';
    case 'skipped':
    case 'nothing_due':
      return null;
  }
}

async function runAndReport(
  context: ScheduleContext,
  work: () => Promise<ScheduledSyncReport>,
): Promise<ScheduledSyncReport> {
  let report: ScheduledSyncReport;
  try {
    report = await work();
  } catch (error) {
    // A sincronização nem começou (ex.: banco de dados fora do ar).
    await context.heartbeat.report('fail');
    throw error;
  }
  const heartbeatResult = heartbeatFor(report.result);
  if (heartbeatResult !== null) await context.heartbeat.report(heartbeatResult);
  return report;
}

function logStartFailure(context: ScheduleContext, error: unknown): void {
  const errorType = error instanceof Error ? error.name : 'unknown';
  context.logger.error({ errorType }, 'scheduled sync could not start');
}

/** A tentativa só olha os bancos que faltam e não agenda outra. */
async function runRetry(context: ScheduleContext): Promise<void> {
  try {
    await runAndReport(context, () => context.sync.catchUpToday());
  } catch (error) {
    logStartFailure(context, error);
  }
}

// Uma tentativa por dia, e só se ela ainda cair hoje em São Paulo: amanhã o cron lê tudo de novo.
function scheduleRetry(context: ScheduleContext, report: ScheduledSyncReport): void {
  if (report.pendingItemCount === 0) return;
  const now = context.now();
  const delayMs = SYNC_RETRY_DELAY_HOURS * MS_PER_HOUR;
  if (toSaoPauloDate(new Date(now.getTime() + delayMs)) !== toSaoPauloDate(now)) return;
  context.logger.info(
    { pendingItemCount: report.pendingItemCount },
    'scheduled sync retry planned',
  );
  context.defer(() => void runRetry(context), delayMs);
}

async function runWithRetry(
  context: ScheduleContext,
  work: () => Promise<ScheduledSyncReport>,
): Promise<void> {
  scheduleRetry(context, await runAndReport(context, work));
}

export function startSyncSchedule(options: SyncScheduleOptions): Cron {
  const context = contextOf(options);
  return new Cron(
    options.pattern,
    {
      name: 'daily-sync',
      timezone: APP_TIMEZONE,
      // Se o disparo anterior ainda estiver rodando, este não começa.
      protect: true,
      catch: (error: unknown) => logStartFailure(context, error),
    },
    () => runWithRetry(context, () => context.sync.runScheduled()),
  );
}

/**
 * Ao subir a API: se o horário do cron de hoje já passou, lê os bancos que ainda não sincronizaram
 * hoje (API desligada ou reiniciando no horário). Nunca rejeita; a falha fica só no log.
 */
export async function recoverMissedSync(options: SyncScheduleOptions): Promise<void> {
  const context = contextOf(options);
  const now = context.now();
  const cron = new Cron(options.pattern, { timezone: APP_TIMEZONE, paused: true });
  const [lastFire] = cron.previousRuns(1, now);
  cron.stop();
  if (!lastFire || toSaoPauloDate(lastFire) !== toSaoPauloDate(now)) return;
  try {
    await runWithRetry(context, () => context.sync.catchUpToday());
  } catch (error) {
    logStartFailure(context, error);
  }
}
