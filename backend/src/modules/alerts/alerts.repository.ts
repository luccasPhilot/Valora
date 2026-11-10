import { and, count, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { alerts, transactions } from '../../db/schema.js';
import { ALERT_TYPES, type AlertSituation, type AlertType } from './alert-situations.js';

const alertTypeSchema = z.enum(ALERT_TYPES);

export interface AlertRecord {
  readonly id: string;
  readonly type: AlertType;
  readonly message: string;
  readonly dedupeKey: string;
  readonly categoryId: string | null;
  /** A transação que gerou o alerta (cobrança duplicada e assinatura), se ainda existir. */
  readonly transaction: AlertTransaction | null;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}

export interface AlertTransaction {
  readonly date: string;
  readonly descriptionNormalized: string;
}

export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

export interface AlertPage {
  readonly items: readonly AlertRecord[];
  readonly total: number;
}

// Ativo = nem dispensado nem resolvido.
const isActive = and(isNull(alerts.dismissedAt), isNull(alerts.resolvedAt));

export class AlertsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Cria os alertas das situações novas. Quem já tem alerta ativo (lido ou dispensado) é ignorado. */
  async createIgnoringConflict(situations: readonly AlertSituation[]): Promise<number> {
    if (situations.length === 0) return 0;
    const rows = await this.db
      .insert(alerts)
      .values(situations.map((situation) => ({ ...situation })))
      .onConflictDoNothing()
      .returning({ id: alerts.id });
    return rows.length;
  }

  /** Resolve os alertas ativos dos `types` cuja situação não está em `activeDedupeKeys`. */
  async resolveActiveExcept(
    types: readonly AlertType[],
    activeDedupeKeys: readonly string[],
  ): Promise<number> {
    const rows = await this.db
      .update(alerts)
      .set({ resolvedAt: new Date() })
      .where(
        and(
          isNull(alerts.resolvedAt),
          inArray(alerts.type, [...types]),
          activeDedupeKeys.length > 0
            ? notInArray(alerts.dedupeKey, [...activeDedupeKeys])
            : undefined,
        ),
      )
      .returning({ id: alerts.id });
    return rows.length;
  }

  async findActivePage({ page, limit }: PageRequest): Promise<AlertPage> {
    const rows = await this.db
      .select({
        alert: alerts,
        transactionDate: transactions.date,
        transactionDescription: transactions.descriptionNormalized,
      })
      .from(alerts)
      .leftJoin(transactions, eq(transactions.id, alerts.transactionId))
      .where(isActive)
      .orderBy(desc(alerts.createdAt), desc(alerts.id))
      .limit(limit)
      .offset((page - 1) * limit);
    const [totals] = await this.db.select({ total: count() }).from(alerts).where(isActive);
    return {
      items: rows.map(({ alert, transactionDate, transactionDescription }) => ({
        id: alert.id,
        type: alertTypeSchema.parse(alert.type),
        message: alert.message,
        dedupeKey: alert.dedupeKey,
        categoryId: alert.categoryId,
        transaction:
          transactionDate !== null && transactionDescription !== null
            ? { date: transactionDate, descriptionNormalized: transactionDescription }
            : null,
        createdAt: alert.createdAt,
        readAt: alert.readAt,
      })),
      total: totals?.total ?? 0,
    };
  }

  async countUnread(): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(alerts)
      .where(and(isActive, isNull(alerts.readAt)));
    return row?.total ?? 0;
  }

  /** Devolve `false` só se o alerta não existe. Marcar de novo mantém a primeira data de leitura. */
  async markRead(alertId: string): Promise<boolean> {
    const rows = await this.db
      .update(alerts)
      .set({ readAt: sql`coalesce(${alerts.readAt}, now())` })
      .where(eq(alerts.id, alertId))
      .returning({ id: alerts.id });
    return rows.length > 0;
  }

  async markAllRead(): Promise<void> {
    await this.db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(isActive, isNull(alerts.readAt)));
  }

  /** Devolve `false` só se o alerta não existe. Dispensar de novo mantém a primeira data. */
  async dismiss(alertId: string): Promise<boolean> {
    const rows = await this.db
      .update(alerts)
      .set({ dismissedAt: sql`coalesce(${alerts.dismissedAt}, now())` })
      .where(eq(alerts.id, alertId))
      .returning({ id: alerts.id });
    return rows.length > 0;
  }
}
