import { and, between, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { accounts, balanceSnapshots, connections } from '../../db/schema.js';
import { APP_TIMEZONE } from '../../shared/timezone.js';

export interface BalancePoint {
  readonly date: string;
  readonly balanceCents: number;
}

export class DashboardRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Soma diária das fotos das contas dadas, só dos dias que têm foto. */
  async findBalanceEvolution(
    accountIds: readonly string[],
    from: string,
    to: string,
  ): Promise<BalancePoint[]> {
    if (accountIds.length === 0) return [];
    return this.db
      .select({
        date: balanceSnapshots.date,
        balanceCents: sql`sum(${balanceSnapshots.balanceCents})`.mapWith(Number),
      })
      .from(balanceSnapshots)
      .where(
        and(
          inArray(balanceSnapshots.accountId, [...accountIds]),
          between(balanceSnapshots.date, from, to),
        ),
      )
      .groupBy(balanceSnapshots.date)
      .orderBy(balanceSnapshots.date);
  }

  /**
   * Como `findBalanceEvolution`, mais o passado dos bancos arquivados: as fotos das contas corrente e
   * poupança não ocultas deles, só dos dias anteriores ao dia do arquivamento (fuso de São Paulo).
   * A curva do passado não muda; a partir do arquivamento o banco deixa de ser somado.
   */
  async findBalanceEvolutionWithArchived(
    activeAccountIds: readonly string[],
    from: string,
    to: string,
  ): Promise<BalancePoint[]> {
    const isActiveAccount =
      activeAccountIds.length > 0
        ? inArray(balanceSnapshots.accountId, [...activeAccountIds])
        : undefined;
    const archivedDay = sql`(${connections.archivedAt} at time zone ${APP_TIMEZONE})::date`;
    const isArchivedBeforeBankLeft = and(
      isNotNull(connections.archivedAt),
      inArray(accounts.type, ['checking', 'savings']),
      eq(accounts.isHidden, false),
      sql`${balanceSnapshots.date} < ${archivedDay}`,
    );
    return this.db
      .select({
        date: balanceSnapshots.date,
        balanceCents: sql`sum(${balanceSnapshots.balanceCents})`.mapWith(Number),
      })
      .from(balanceSnapshots)
      .innerJoin(accounts, eq(accounts.id, balanceSnapshots.accountId))
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .where(
        and(
          between(balanceSnapshots.date, from, to),
          or(isActiveAccount, isArchivedBeforeBankLeft),
        ),
      )
      .groupBy(balanceSnapshots.date)
      .orderBy(balanceSnapshots.date);
  }
}
