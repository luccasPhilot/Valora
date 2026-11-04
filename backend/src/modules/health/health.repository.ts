import { sql } from 'drizzle-orm';

import type { Db } from '../../db/database.js';

export class HealthRepository {
  constructor(private readonly db: Db) {}

  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
