import { and, asc, eq, gte, inArray, max, min } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, balanceSnapshots, connections, transactions } from '../../db/schema.js';
import { connectionIsActive } from '../connections/active-connection.js';
import { CONNECTION_STATUSES } from '../connections/connections.repository.js';
import type {
  ReconciliationSnapshot,
  ReconciliationTransaction,
} from './balance-reconciliation.js';
import type { StaleAccountCandidate } from './stale-accounts.js';

const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash']);
const connectionStatusSchema = z.enum(CONNECTION_STATUSES);
const transactionStatusSchema = z.enum(['pending', 'posted']);
const transactionSourceSchema = z.enum(['open_finance', 'manual']);

// Só estas contas têm saldo que se explica pelas transações; o do cartão é a fatura.
const RECONCILED_ACCOUNT_TYPES = ['checking', 'savings'];

export interface ReconciliationAccount {
  readonly accountId: string;
  readonly accountName: string;
  readonly snapshots: readonly ReconciliationSnapshot[];
  readonly transactions: readonly ReconciliationTransaction[];
}

export class DataHealthRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Contas correntes e poupanças de bancos ativos, com as fotos e as transações desde `since`. */
  async findReconciliationAccounts(since: string): Promise<ReconciliationAccount[]> {
    const accountRows = await this.db
      .select({ accountId: accounts.id, accountName: accounts.name })
      .from(accounts)
      .innerJoin(connections, eq(accounts.connectionId, connections.id))
      .where(and(connectionIsActive, inArray(accounts.type, RECONCILED_ACCOUNT_TYPES)))
      .orderBy(asc(accounts.name));
    if (accountRows.length === 0) return [];
    const accountIds = accountRows.map(({ accountId }) => accountId);
    const snapshotRows = await this.findSnapshots(accountIds, since);
    const transactionRows = await this.findTransactions(accountIds, since);
    return accountRows.map((account) => ({
      ...account,
      snapshots: snapshotRows.filter((row) => row.accountId === account.accountId),
      transactions: transactionRows.filter((row) => row.accountId === account.accountId),
    }));
  }

  /** Cada conta de banco ativo, com a transação do Open Finance mais recente e a primeira foto. */
  async findStaleAccountCandidates(): Promise<StaleAccountCandidate[]> {
    const lastTransactions = this.db
      .select({
        accountId: transactions.accountId,
        lastDate: max(transactions.date).as('last_date'),
      })
      .from(transactions)
      .where(eq(transactions.source, 'open_finance'))
      .groupBy(transactions.accountId)
      .as('last_transactions');
    const firstSnapshots = this.db
      .select({
        accountId: balanceSnapshots.accountId,
        firstDate: min(balanceSnapshots.date).as('first_date'),
      })
      .from(balanceSnapshots)
      .groupBy(balanceSnapshots.accountId)
      .as('first_snapshots');
    const rows = await this.db
      .select({
        accountId: accounts.id,
        accountName: accounts.name,
        type: accounts.type,
        isHidden: accounts.isHidden,
        connectionStatus: connections.status,
        lastTransactionDate: lastTransactions.lastDate,
        firstSnapshotDate: firstSnapshots.firstDate,
      })
      .from(accounts)
      .innerJoin(connections, eq(accounts.connectionId, connections.id))
      .leftJoin(lastTransactions, eq(lastTransactions.accountId, accounts.id))
      .leftJoin(firstSnapshots, eq(firstSnapshots.accountId, accounts.id))
      .where(connectionIsActive);
    return rows.map((row) => ({
      ...row,
      type: accountTypeSchema.parse(row.type),
      connectionStatus: connectionStatusSchema.parse(row.connectionStatus),
    }));
  }

  private findSnapshots(accountIds: readonly string[], since: string) {
    return this.db
      .select({
        accountId: balanceSnapshots.accountId,
        date: balanceSnapshots.date,
        balanceCents: balanceSnapshots.balanceCents,
      })
      .from(balanceSnapshots)
      .where(
        and(
          inArray(balanceSnapshots.accountId, [...accountIds]),
          gte(balanceSnapshots.date, since),
        ),
      )
      .orderBy(asc(balanceSnapshots.date));
  }

  private async findTransactions(accountIds: readonly string[], since: string) {
    const rows = await this.db
      .select({
        accountId: transactions.accountId,
        date: transactions.date,
        amountCents: transactions.amountCents,
        status: transactions.status,
        source: transactions.source,
      })
      .from(transactions)
      .where(and(inArray(transactions.accountId, [...accountIds]), gte(transactions.date, since)));
    return rows.map((row) => ({
      ...row,
      status: transactionStatusSchema.parse(row.status),
      source: transactionSourceSchema.parse(row.source),
    }));
  }
}
