import { asc, eq, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, connections } from '../../db/schema.js';
import { connectionIsActive } from './active-connection.js';

/** Única lista de status de conexão do backend: o repository, as rotas e as contas usam esta. */
export const CONNECTION_STATUSES = [
  'ok',
  'syncing',
  'error',
  'consent_expired',
  'item_not_found',
] as const;
const connectionStatusSchema = z.enum(CONNECTION_STATUSES);
const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash']);

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export interface ConnectionRecord {
  readonly id: string;
  readonly pluggyItemId: string;
  readonly institutionName: string;
  readonly institutionLogoUrl: string | null;
  readonly status: ConnectionStatus;
  readonly statusDetail: string | null;
  readonly lastSyncedAt: Date | null;
  /** Nulo = banco ativo. */
  readonly archivedAt: Date | null;
}

export interface ConnectionAccountSummary {
  readonly id: string;
  readonly name: string;
  readonly type: z.infer<typeof accountTypeSchema>;
  readonly lastDigits: string | null;
}

export interface ConnectionWithAccounts extends ConnectionRecord {
  readonly accounts: readonly ConnectionAccountSummary[];
}

export interface ConnectionStatusUpdate {
  readonly status: ConnectionStatus;
  readonly statusDetail: string | null;
}

export interface ConnectionSyncUpdate {
  readonly institutionName: string;
  readonly institutionLogoUrl: string | null;
  readonly syncedAt: Date;
}

function toRecord(row: typeof connections.$inferSelect): ConnectionRecord {
  return {
    id: row.id,
    pluggyItemId: row.pluggyItemId,
    institutionName: row.institutionName,
    institutionLogoUrl: row.institutionLogoUrl,
    status: connectionStatusSchema.parse(row.status),
    statusDetail: row.statusDetail,
    lastSyncedAt: row.lastSyncedAt,
    archivedAt: row.archivedAt,
  };
}

export class ConnectionsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Cria a conexão do item se ela ainda não existe e devolve a linha atual. */
  async ensure(pluggyItemId: string, placeholderName: string): Promise<ConnectionRecord> {
    await this.db
      .insert(connections)
      .values({ pluggyItemId, institutionName: placeholderName })
      .onConflictDoNothing({ target: connections.pluggyItemId });
    const [row] = await this.db
      .select()
      .from(connections)
      .where(eq(connections.pluggyItemId, pluggyItemId));
    if (!row) throw new Error(`Conexão do item ${pluggyItemId} sumiu logo depois de ser criada`);
    return toRecord(row);
  }

  async updateStatus(connectionId: string, update: ConnectionStatusUpdate): Promise<void> {
    await this.db
      .update(connections)
      .set({ status: update.status, statusDetail: update.statusDetail, updatedAt: new Date() })
      .where(eq(connections.id, connectionId));
  }

  async markSynced(connectionId: string, update: ConnectionSyncUpdate): Promise<void> {
    await this.db
      .update(connections)
      .set({
        institutionName: update.institutionName,
        institutionLogoUrl: update.institutionLogoUrl,
        lastSyncedAt: update.syncedAt,
        updatedAt: update.syncedAt,
      })
      .where(eq(connections.id, connectionId));
  }

  /** Só os bancos ativos (não arquivados). É o que o avaliador de alertas olha. */
  async findActive(): Promise<ConnectionRecord[]> {
    const rows = await this.db
      .select()
      .from(connections)
      .where(connectionIsActive)
      .orderBy(asc(connections.institutionName), asc(connections.createdAt));
    return rows.map(toRecord);
  }

  async findById(connectionId: string): Promise<ConnectionRecord | null> {
    const [row] = await this.db.select().from(connections).where(eq(connections.id, connectionId));
    return row ? toRecord(row) : null;
  }

  /** Os bancos ativos (ou, com `isArchived`, os arquivados), cada um com as contas dele. */
  async findWithAccounts({
    isArchived,
  }: {
    isArchived: boolean;
  }): Promise<ConnectionWithAccounts[]> {
    const rows = await this.db
      .select()
      .from(connections)
      .where(isArchived ? isNotNull(connections.archivedAt) : connectionIsActive)
      .orderBy(asc(connections.institutionName), asc(connections.createdAt));
    if (rows.length === 0) return [];
    const accountRows = await this.db
      .select({
        id: accounts.id,
        connectionId: accounts.connectionId,
        name: accounts.name,
        type: accounts.type,
        lastDigits: accounts.numberLastDigits,
      })
      .from(accounts)
      .where(isNotNull(accounts.connectionId))
      .orderBy(asc(accounts.name));
    return rows.map((row) => ({
      ...toRecord(row),
      accounts: accountRows
        .filter((account) => account.connectionId === row.id)
        .map((account) => ({
          id: account.id,
          name: account.name,
          type: accountTypeSchema.parse(account.type),
          lastDigits: account.lastDigits,
        })),
    }));
  }

  /** Arquivar mantém a primeira data (repetir não muda nada); reativar limpa a data. Nada é apagado. */
  async setArchived(connectionId: string, isArchived: boolean): Promise<ConnectionRecord | null> {
    const [row] = await this.db
      .update(connections)
      .set({
        archivedAt: isArchived ? sql`coalesce(${connections.archivedAt}, now())` : null,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, connectionId))
      .returning();
    return row ? toRecord(row) : null;
  }
}
