import { and, type AnyColumn, count, eq, ne, notExists, type SQL, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import {
  accounts,
  balanceSnapshots,
  connections,
  investments,
  investmentSnapshots,
} from '../../db/schema.js';
import { APP_TIMEZONE } from '../../shared/timezone.js';
import {
  accountIsOfActiveConnection,
  investmentIsOfActiveConnection,
} from '../connections/active-connection.js';
import type { MissingSnapshotCounts } from './alert-situations.js';

/** O instante `createdAt` cai em `date` ou antes, no fuso de São Paulo. */
function createdOnOrBefore(createdAt: AnyColumn, date: string): SQL {
  return sql`(${createdAt} at time zone ${APP_TIMEZONE})::date <= ${date}`;
}

export class YearEndSnapshotsRepository {
  constructor(private readonly db: DbExecutor) {}

  /**
   * Contas e posições que deveriam ter foto em `date` (AAAA-MM-DD) e não têm: de banco ativo (ou
   * manuais), criadas até `date` em São Paulo. A conta "Dinheiro" não tem foto e a posição zerada não
   * vai para o IR, então ficam de fora; as contas ocultas dos totais entram.
   */
  async countMissingSnapshots(date: string): Promise<MissingSnapshotCounts> {
    const [accountsMissing, investmentsMissing] = await Promise.all([
      this.countAccountsWithoutSnapshot(date),
      this.countInvestmentsWithoutSnapshot(date),
    ]);
    return { accounts: accountsMissing, investments: investmentsMissing };
  }

  private async countAccountsWithoutSnapshot(date: string): Promise<number> {
    const snapshotOfDate = this.db
      .select({ accountId: balanceSnapshots.accountId })
      .from(balanceSnapshots)
      .where(and(eq(balanceSnapshots.accountId, accounts.id), eq(balanceSnapshots.date, date)));
    const [row] = await this.db
      .select({ total: count() })
      .from(accounts)
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .where(
        and(
          accountIsOfActiveConnection,
          ne(accounts.type, 'cash'),
          createdOnOrBefore(accounts.createdAt, date),
          notExists(snapshotOfDate),
        ),
      );
    return row?.total ?? 0;
  }

  private async countInvestmentsWithoutSnapshot(date: string): Promise<number> {
    const snapshotOfDate = this.db
      .select({ investmentId: investmentSnapshots.investmentId })
      .from(investmentSnapshots)
      .where(
        and(
          eq(investmentSnapshots.investmentId, investments.id),
          eq(investmentSnapshots.date, date),
        ),
      );
    const [row] = await this.db
      .select({ total: count() })
      .from(investments)
      .leftJoin(connections, eq(connections.id, investments.connectionId))
      .where(
        and(
          investmentIsOfActiveConnection,
          ne(investments.balanceCents, 0),
          createdOnOrBefore(investments.createdAt, date),
          notExists(snapshotOfDate),
        ),
      );
    return row?.total ?? 0;
  }
}
