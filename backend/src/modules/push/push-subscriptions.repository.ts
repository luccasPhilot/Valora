import { eq, inArray, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { pushSubscriptions } from '../../db/schema.js';
import type { PushSubscriptionRecord } from './push-sender.js';

export class PushSubscriptionsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Grava ou atualiza pelo `endpoint`: o mesmo aparelho inscrito de novo continua sendo uma linha. */
  async upsert(subscription: PushSubscriptionRecord): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: subscription.p256dh, auth: subscription.auth },
      });
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async findAll(): Promise<PushSubscriptionRecord[]> {
    return this.db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions);
  }

  async markSucceeded(endpoints: readonly string[]): Promise<void> {
    if (endpoints.length === 0) return;
    await this.db
      .update(pushSubscriptions)
      .set({ lastSuccessAt: sql`now()` })
      .where(inArray(pushSubscriptions.endpoint, [...endpoints]));
  }
}
