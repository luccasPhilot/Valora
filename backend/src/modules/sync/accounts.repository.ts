import { isNotNull, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { accounts, balanceSnapshots } from '../../db/schema.js';
import type { SyncedAccount } from './sync.types.js';

export interface BalanceSnapshot {
  readonly accountId: string;
  readonly balanceCents: number;
}

export class AccountsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Grava ou atualiza pelo id do Pluggy. Devolve o id interno de cada conta, pelo id do Pluggy. */
  async upsertMany(
    connectionId: string,
    syncedAccounts: readonly SyncedAccount[],
  ): Promise<Map<string, string>> {
    if (syncedAccounts.length === 0) return new Map();
    const rows = await this.db
      .insert(accounts)
      .values(syncedAccounts.map((account) => ({ connectionId, ...account })))
      .onConflictDoUpdate({
        target: accounts.pluggyAccountId,
        targetWhere: isNotNull(accounts.pluggyAccountId),
        // `is_hidden` é escolha sua e `connection_id` não muda: ficam fora.
        set: {
          type: sql`excluded.type`,
          name: sql`excluded.name`,
          numberLastDigits: sql`excluded.number_last_digits`,
          balanceCents: sql`excluded.balance_cents`,
          creditLimitCents: sql`excluded.credit_limit_cents`,
          availableLimitCents: sql`excluded.available_limit_cents`,
          raw: sql`excluded.raw`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: accounts.id, pluggyAccountId: accounts.pluggyAccountId });
    return new Map(rows.map((row) => [row.pluggyAccountId ?? '', row.id]));
  }

  /** Uma foto por conta e por dia: a segunda sincronização do dia substitui a primeira. */
  async saveSnapshots(snapshots: readonly BalanceSnapshot[], date: string): Promise<void> {
    if (snapshots.length === 0) return;
    await this.db
      .insert(balanceSnapshots)
      .values(snapshots.map((snapshot) => ({ ...snapshot, date })))
      .onConflictDoUpdate({
        target: [balanceSnapshots.accountId, balanceSnapshots.date],
        set: { balanceCents: sql`excluded.balance_cents` },
      });
  }
}
