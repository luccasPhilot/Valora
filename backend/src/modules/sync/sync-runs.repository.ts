import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { syncRuns } from '../../db/schema.js';

const syncRunStatusSchema = z.enum(['running', 'success', 'partial', 'failed']);
const syncTriggerSchema = z.enum(['schedule', 'manual']);
const syncStatsSchema = z.object({
  accounts: z.int(),
  transactionsInserted: z.int(),
  transactionsUpdated: z.int(),
  transactionsRemoved: z.int(),
  investments: z.int(),
});

export type SyncRunStatus = z.infer<typeof syncRunStatusSchema>;
export type SyncTrigger = z.infer<typeof syncTriggerSchema>;
export type SyncStats = z.infer<typeof syncStatsSchema>;
export type FinishedSyncRunStatus = Exclude<SyncRunStatus, 'running'>;

export interface SyncRunRecord {
  readonly id: string;
  readonly trigger: SyncTrigger;
  readonly status: SyncRunStatus;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly stats: SyncStats | null;
  readonly errorMessage: string | null;
}

export interface SyncRunOutcome {
  readonly status: FinishedSyncRunStatus;
  readonly stats: SyncStats;
  readonly errorMessage: string | null;
}

function toRecord(row: typeof syncRuns.$inferSelect): SyncRunRecord {
  return {
    id: row.id,
    trigger: syncTriggerSchema.parse(row.trigger),
    status: syncRunStatusSchema.parse(row.status),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    stats: row.stats === null ? null : syncStatsSchema.parse(row.stats),
    errorMessage: row.errorMessage,
  };
}

export class SyncRunsRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(trigger: SyncTrigger): Promise<SyncRunRecord> {
    const [row] = await this.db.insert(syncRuns).values({ trigger }).returning();
    if (!row) throw new Error(`Execução de sincronização (${trigger}) não foi criada`);
    return toRecord(row);
  }

  async finish(runId: string, outcome: SyncRunOutcome): Promise<void> {
    await this.db
      .update(syncRuns)
      .set({ ...outcome, finishedAt: new Date() })
      .where(eq(syncRuns.id, runId));
  }

  async findLatest(): Promise<SyncRunRecord | null> {
    const [row] = await this.db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1);
    return row ? toRecord(row) : null;
  }

  /** Fecha as execuções que ficaram `running` porque o processo parou no meio. */
  async failInterrupted(errorMessage: string): Promise<number> {
    const rows = await this.db
      .update(syncRuns)
      .set({ status: 'failed', finishedAt: new Date(), errorMessage })
      .where(eq(syncRuns.status, 'running'))
      .returning({ id: syncRuns.id });
    return rows.length;
  }
}
