import { and, eq, notInArray, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { investments, investmentSnapshots } from '../../db/schema.js';
import type { SyncedInvestment } from './sync.types.js';

export class InvestmentsRepository {
  constructor(private readonly db: DbExecutor) {}

  /**
   * Grava ou atualiza pelo id do Pluggy e guarda a foto do dia de cada investimento. O que o banco
   * deixou de devolver foi resgatado: a posição vai a zero (com a foto do dia), senão o último valor
   * ficaria somando para sempre. Devolve quantos investimentos vieram do Pluggy.
   */
  async upsertWithSnapshots(
    connectionId: string,
    syncedInvestments: readonly SyncedInvestment[],
    date: string,
  ): Promise<number> {
    const savedRows = await this.upsert(connectionId, syncedInvestments);
    const vanishedRows = await this.zeroVanished(
      connectionId,
      syncedInvestments.map(({ pluggyInvestmentId }) => pluggyInvestmentId),
    );
    await this.saveSnapshots([...savedRows, ...vanishedRows], date);
    return savedRows.length;
  }

  private async upsert(
    connectionId: string,
    syncedInvestments: readonly SyncedInvestment[],
  ): Promise<SnapshotRow[]> {
    if (syncedInvestments.length === 0) return [];
    return this.db
      .insert(investments)
      .values(syncedInvestments.map((investment) => ({ connectionId, ...investment })))
      .onConflictDoUpdate({
        target: investments.pluggyInvestmentId,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          subtype: sql`excluded.subtype`,
          balanceCents: sql`excluded.balance_cents`,
          raw: sql`excluded.raw`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: investments.id, balanceCents: investments.balanceCents });
  }

  // Só as posições ainda com saldo: as que já estão em zero não têm o que mudar.
  private async zeroVanished(
    connectionId: string,
    returnedPluggyIds: readonly string[],
  ): Promise<SnapshotRow[]> {
    const belongsToConnection = and(
      eq(investments.connectionId, connectionId),
      sql`${investments.balanceCents} <> 0`,
    );
    return this.db
      .update(investments)
      .set({ balanceCents: 0, updatedAt: sql`now()` })
      .where(
        returnedPluggyIds.length === 0
          ? belongsToConnection
          : and(
              belongsToConnection,
              notInArray(investments.pluggyInvestmentId, [...returnedPluggyIds]),
            ),
      )
      .returning({ id: investments.id, balanceCents: investments.balanceCents });
  }

  private async saveSnapshots(rows: readonly SnapshotRow[], date: string): Promise<void> {
    if (rows.length === 0) return;
    await this.db
      .insert(investmentSnapshots)
      .values(rows.map((row) => ({ investmentId: row.id, date, balanceCents: row.balanceCents })))
      .onConflictDoUpdate({
        target: [investmentSnapshots.investmentId, investmentSnapshots.date],
        set: { balanceCents: sql`excluded.balance_cents` },
      });
  }
}

interface SnapshotRow {
  readonly id: string;
  readonly balanceCents: number;
}
