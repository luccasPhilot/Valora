import { eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { connections, investments, investmentSnapshots } from '../../db/schema.js';
import { investmentIsOfActiveConnection } from '../connections/active-connection.js';
import { type InvestmentPosition, investmentSourceSchema } from './investment-groups.js';
import { investmentInstitutionName } from './investment-institution.js';

export interface ManualInvestmentFields {
  readonly name: string;
  readonly institutionName: string;
  readonly type: string;
  readonly balanceCents: number;
}

export interface InvestmentRecord {
  readonly id: string;
  readonly source: 'open_finance' | 'manual';
}

export interface ManualInvestmentRecord extends ManualInvestmentFields {
  readonly id: string;
  readonly balanceUpdatedOn: string | null;
}

const manualInvestmentColumns = {
  id: investments.id,
  name: investments.name,
  institutionName: sql<string>`${investments.institutionName}`,
  type: investments.type,
  balanceCents: investments.balanceCents,
  balanceUpdatedOn: investments.balanceUpdatedOn,
};

export class InvestmentsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Posições de bancos ativos e todas as manuais, inclusive as zeradas (a lista só as conta). */
  async findActivePositions(): Promise<InvestmentPosition[]> {
    const rows = await this.db
      .select({
        id: investments.id,
        name: investments.name,
        type: investments.type,
        subtype: investments.subtype,
        balanceCents: investments.balanceCents,
        institutionName: investmentInstitutionName,
        source: investments.source,
        balanceUpdatedOn: investments.balanceUpdatedOn,
      })
      .from(investments)
      .leftJoin(connections, eq(connections.id, investments.connectionId))
      .where(investmentIsOfActiveConnection);
    return rows.map((row) => ({ ...row, source: investmentSourceSchema.parse(row.source) }));
  }

  async findById(id: string): Promise<InvestmentRecord | null> {
    const [row] = await this.db
      .select({ id: investments.id, source: investments.source })
      .from(investments)
      .where(eq(investments.id, id));
    return row ? { id: row.id, source: investmentSourceSchema.parse(row.source) } : null;
  }

  /** Cria a posição manual e grava a foto de `today` na mesma transação. */
  async createManual(
    fields: ManualInvestmentFields,
    today: string,
  ): Promise<ManualInvestmentRecord> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(investments)
        .values({ ...fields, source: 'manual', balanceUpdatedOn: today })
        .returning(manualInvestmentColumns);
      if (!created) throw new Error('Insert da posição manual não devolveu a linha criada');
      await this.upsertSnapshot(tx, created.id, today, created.balanceCents);
      return created;
    });
  }

  /**
   * Atualiza a posição manual. Só quando o valor vem no pedido a data do último valor e a foto de
   * `today` mudam. Devolve `null` se a posição não existe mais.
   */
  async updateManual(
    id: string,
    changes: Partial<ManualInvestmentFields>,
    today: string,
  ): Promise<ManualInvestmentRecord | null> {
    return this.db.transaction(async (tx) => {
      const valueChange = changes.balanceCents === undefined ? {} : { balanceUpdatedOn: today };
      const [updated] = await tx
        .update(investments)
        .set({ ...changes, ...valueChange, updatedAt: sql`now()` })
        .where(eq(investments.id, id))
        .returning(manualInvestmentColumns);
      if (updated && changes.balanceCents !== undefined) {
        await this.upsertSnapshot(tx, id, today, changes.balanceCents);
      }
      return updated ?? null;
    });
  }

  /** As fotos e os vínculos de metas saem em cascata. */
  async deleteManual(id: string): Promise<void> {
    await this.db.delete(investments).where(eq(investments.id, id));
  }

  /** Foto de `date` de todas as posições manuais, com o saldo atual (inclusive as zeradas). */
  async saveManualSnapshots(date: string): Promise<number> {
    const snapshots = await this.db
      .insert(investmentSnapshots)
      .select(
        this.db
          .select({
            investmentId: investments.id,
            date: sql<string>`${date}::date`.as('date'),
            balanceCents: investments.balanceCents,
          })
          .from(investments)
          .where(eq(investments.source, 'manual')),
      )
      .onConflictDoUpdate({
        target: [investmentSnapshots.investmentId, investmentSnapshots.date],
        set: { balanceCents: sql`excluded.balance_cents` },
      })
      .returning({ investmentId: investmentSnapshots.investmentId });
    return snapshots.length;
  }

  private async upsertSnapshot(
    executor: DbExecutor,
    investmentId: string,
    date: string,
    balanceCents: number,
  ): Promise<void> {
    await executor
      .insert(investmentSnapshots)
      .values({ investmentId, date, balanceCents })
      .onConflictDoUpdate({
        target: [investmentSnapshots.investmentId, investmentSnapshots.date],
        set: { balanceCents },
      });
  }
}
