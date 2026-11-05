import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, connections } from '../../db/schema.js';

const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash']);
const connectionStatusSchema = z.enum(['ok', 'syncing', 'error', 'consent_expired']);

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountConnectionStatus = z.infer<typeof connectionStatusSchema>;

export interface AccountConnection {
  readonly id: string;
  readonly institutionName: string;
  readonly status: AccountConnectionStatus;
  readonly statusDetail: string | null;
  readonly lastSyncedAt: Date | null;
}

export interface AccountRecord {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly lastDigits: string | null;
  /** Nulo na conta "Dinheiro". No cartão, é o valor da fatura atual. */
  readonly balanceCents: number | null;
  readonly creditLimitCents: number | null;
  readonly availableLimitCents: number | null;
  readonly isHidden: boolean;
  /** Nulo na conta "Dinheiro", que não pertence a nenhum banco. */
  readonly connection: AccountConnection | null;
}

const accountColumns = {
  id: accounts.id,
  name: accounts.name,
  type: accounts.type,
  lastDigits: accounts.numberLastDigits,
  balanceCents: accounts.balanceCents,
  creditLimitCents: accounts.creditLimitCents,
  availableLimitCents: accounts.availableLimitCents,
  isHidden: accounts.isHidden,
  connectionId: connections.id,
  institutionName: connections.institutionName,
  connectionStatus: connections.status,
  connectionStatusDetail: connections.statusDetail,
  lastSyncedAt: connections.lastSyncedAt,
};

// As colunas da conexão são nulas na conta "Dinheiro" (leftJoin).
interface AccountRow {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly lastDigits: string | null;
  readonly balanceCents: number | null;
  readonly creditLimitCents: number | null;
  readonly availableLimitCents: number | null;
  readonly isHidden: boolean;
  readonly connectionId: string | null;
  readonly institutionName: string | null;
  readonly connectionStatus: string | null;
  readonly connectionStatusDetail: string | null;
  readonly lastSyncedAt: Date | null;
}

function toRecord(row: AccountRow): AccountRecord {
  const hasConnection = row.connectionId !== null && row.institutionName !== null;
  return {
    id: row.id,
    name: row.name,
    type: accountTypeSchema.parse(row.type),
    lastDigits: row.lastDigits,
    balanceCents: row.balanceCents,
    creditLimitCents: row.creditLimitCents,
    availableLimitCents: row.availableLimitCents,
    isHidden: row.isHidden,
    connection: hasConnection
      ? {
          id: row.connectionId ?? '',
          institutionName: row.institutionName ?? '',
          status: connectionStatusSchema.parse(row.connectionStatus),
          statusDetail: row.connectionStatusDetail,
          lastSyncedAt: row.lastSyncedAt,
        }
      : null,
  };
}

export class AccountsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Cria a conta "Dinheiro" se ainda não existe. O índice único parcial garante uma só. */
  async insertCashAccountIfMissing(name: string): Promise<boolean> {
    const rows = await this.db
      .insert(accounts)
      .values({ type: 'cash', name })
      .onConflictDoNothing()
      .returning({ id: accounts.id });
    return rows.length > 0;
  }

  async exists(accountId: string): Promise<boolean> {
    return (await this.db.$count(accounts, eq(accounts.id, accountId))) > 0;
  }

  async findAll(): Promise<AccountRecord[]> {
    const rows = await this.db
      .select(accountColumns)
      .from(accounts)
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .orderBy(asc(connections.institutionName), asc(accounts.name));
    return rows.map(toRecord);
  }

  async findById(accountId: string): Promise<AccountRecord | null> {
    const [row] = await this.db
      .select(accountColumns)
      .from(accounts)
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .where(eq(accounts.id, accountId));
    return row ? toRecord(row) : null;
  }

  async updateHidden(accountId: string, isHidden: boolean): Promise<void> {
    await this.db
      .update(accounts)
      .set({ isHidden, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));
  }
}
