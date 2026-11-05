import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { connections } from '../../db/schema.js';

const connectionStatusSchema = z.enum(['ok', 'syncing', 'error', 'consent_expired']);

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export interface ConnectionRecord {
  readonly id: string;
  readonly pluggyItemId: string;
  readonly institutionName: string;
  readonly institutionLogoUrl: string | null;
  readonly status: ConnectionStatus;
  readonly statusDetail: string | null;
  readonly lastSyncedAt: Date | null;
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

  async findAll(): Promise<ConnectionRecord[]> {
    const rows = await this.db
      .select()
      .from(connections)
      .orderBy(asc(connections.institutionName), asc(connections.createdAt));
    return rows.map(toRecord);
  }
}
