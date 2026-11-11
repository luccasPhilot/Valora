import { between, eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import {
  accounts,
  balanceSnapshots,
  connections,
  investments,
  investmentSnapshots,
} from '../../db/schema.js';
import { APP_TIMEZONE } from '../../shared/timezone.js';
import { accountTypeSchema } from '../accounts/accounts.repository.js';
import type { SnapshotRow } from './net-worth-calculations.js';

// Dia do arquivamento no fuso de São Paulo, como texto AAAA-MM-DD; nulo no banco ativo e na conta "Dinheiro".
const archivedDay = sql<
  string | null
>`to_char((${connections.archivedAt} at time zone ${APP_TIMEZONE})::date, 'YYYY-MM-DD')`;

const firstSnapshotDay = (column: typeof balanceSnapshots.date | typeof investmentSnapshots.date) =>
  sql<string | null>`to_char(min(${column}), 'YYYY-MM-DD')`;

export class NetWorthRepository {
  constructor(private readonly db: DbExecutor) {}

  /**
   * As fotos de contas e de investimentos de `from` a `to`, uma consulta para cada tabela, com o que
   * a regra de patrimônio precisa saber do item (tipo, ocultação e arquivamento do banco).
   */
  async findSnapshots(from: string, to: string): Promise<SnapshotRow[]> {
    const [accountRows, investmentRows] = await Promise.all([
      this.findAccountSnapshots(from, to),
      this.findInvestmentSnapshots(from, to),
    ]);
    return [...accountRows, ...investmentRows];
  }

  /** O dia da foto mais antiga, de contas ou de investimentos; nulo sem nenhuma foto. */
  async findFirstSnapshotDate(): Promise<string | null> {
    const [[accountFirst], [investmentFirst]] = await Promise.all([
      this.db.select({ date: firstSnapshotDay(balanceSnapshots.date) }).from(balanceSnapshots),
      this.db
        .select({ date: firstSnapshotDay(investmentSnapshots.date) })
        .from(investmentSnapshots),
    ]);
    const dates = [accountFirst?.date, investmentFirst?.date].filter(
      (date): date is string => typeof date === 'string',
    );
    return dates.sort()[0] ?? null;
  }

  private async findAccountSnapshots(from: string, to: string): Promise<SnapshotRow[]> {
    const rows = await this.db
      .select({
        itemId: balanceSnapshots.accountId,
        type: accounts.type,
        isHidden: accounts.isHidden,
        archivedOn: archivedDay,
        date: balanceSnapshots.date,
        cents: balanceSnapshots.balanceCents,
      })
      .from(balanceSnapshots)
      .innerJoin(accounts, eq(accounts.id, balanceSnapshots.accountId))
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .where(between(balanceSnapshots.date, from, to))
      .orderBy(balanceSnapshots.accountId, balanceSnapshots.date);
    return rows.map((row) => ({ ...row, type: accountTypeSchema.parse(row.type) }));
  }

  private async findInvestmentSnapshots(from: string, to: string): Promise<SnapshotRow[]> {
    const rows = await this.db
      .select({
        itemId: investmentSnapshots.investmentId,
        archivedOn: archivedDay,
        date: investmentSnapshots.date,
        cents: investmentSnapshots.balanceCents,
      })
      .from(investmentSnapshots)
      .innerJoin(investments, eq(investments.id, investmentSnapshots.investmentId))
      .innerJoin(connections, eq(connections.id, investments.connectionId))
      .where(between(investmentSnapshots.date, from, to))
      .orderBy(investmentSnapshots.investmentId, investmentSnapshots.date);
    return rows.map((row) => ({ ...row, type: 'investment', isHidden: false }));
  }
}
