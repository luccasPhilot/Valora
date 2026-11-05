import { sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { investments, investmentSnapshots } from '../../db/schema.js';
import type { SyncedInvestment } from './sync.types.js';

export class InvestmentsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Grava ou atualiza pelo id do Pluggy e guarda a foto do dia de cada investimento. */
  async upsertWithSnapshots(
    connectionId: string,
    syncedInvestments: readonly SyncedInvestment[],
    date: string,
  ): Promise<number> {
    if (syncedInvestments.length === 0) return 0;
    const rows = await this.db
      .insert(investments)
      .values(syncedInvestments.map((investment) => ({ connectionId, ...investment })))
      .onConflictDoUpdate({
        target: investments.pluggyInvestmentId,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          balanceCents: sql`excluded.balance_cents`,
          raw: sql`excluded.raw`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: investments.id, balanceCents: investments.balanceCents });
    await this.db
      .insert(investmentSnapshots)
      .values(rows.map((row) => ({ investmentId: row.id, date, balanceCents: row.balanceCents })))
      .onConflictDoUpdate({
        target: [investmentSnapshots.investmentId, investmentSnapshots.date],
        set: { balanceCents: sql`excluded.balance_cents` },
      });
    return rows.length;
  }
}
