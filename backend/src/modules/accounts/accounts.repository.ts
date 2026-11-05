import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, connections } from '../../db/schema.js';

const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash']);

export type AccountType = z.infer<typeof accountTypeSchema>;

export interface AccountOption {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  /** Nulo na conta "Dinheiro", que não pertence a nenhum banco. */
  readonly institutionName: string | null;
}

export class AccountsRepository {
  constructor(private readonly db: DbExecutor) {}

  async findAllOptions(): Promise<AccountOption[]> {
    const rows = await this.db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        institutionName: connections.institutionName,
      })
      .from(accounts)
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .orderBy(asc(connections.institutionName), asc(accounts.name));
    return rows.map((row) => ({ ...row, type: accountTypeSchema.parse(row.type) }));
  }
}
