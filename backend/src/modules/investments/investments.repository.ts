import { eq } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { connections, investments } from '../../db/schema.js';
import { connectionIsActive } from '../connections/active-connection.js';
import type { InvestmentPosition } from './investment-groups.js';

export class InvestmentsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Todas as posições de bancos ativos, inclusive as zeradas (a lista só as conta). */
  async findActivePositions(): Promise<InvestmentPosition[]> {
    return this.db
      .select({
        id: investments.id,
        name: investments.name,
        type: investments.type,
        subtype: investments.subtype,
        balanceCents: investments.balanceCents,
        institutionName: connections.institutionName,
      })
      .from(investments)
      .innerJoin(connections, eq(connections.id, investments.connectionId))
      .where(connectionIsActive);
  }
}
