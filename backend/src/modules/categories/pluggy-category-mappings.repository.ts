import { eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { pluggyCategoryMappings, transactions } from '../../db/schema.js';

export interface PluggyCategoryMappingRecord {
  readonly pluggyCategory: string;
  readonly categoryId: string;
}

export class PluggyCategoryMappingsRepository {
  constructor(private readonly db: DbExecutor) {}

  async findAll(): Promise<PluggyCategoryMappingRecord[]> {
    return this.db.select().from(pluggyCategoryMappings);
  }

  /** As categorias do Pluggy já vistas nas transações, para a tela listar também as sem mapeamento. */
  async findPluggyCategoriesInTransactions(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ pluggyCategory: transactions.pluggyCategory })
      .from(transactions)
      .where(sql`${transactions.pluggyCategory} is not null`);
    return rows.flatMap((row) => (row.pluggyCategory === null ? [] : [row.pluggyCategory]));
  }

  async upsert(mapping: PluggyCategoryMappingRecord): Promise<void> {
    await this.db
      .insert(pluggyCategoryMappings)
      .values(mapping)
      .onConflictDoUpdate({
        target: pluggyCategoryMappings.pluggyCategory,
        set: { categoryId: mapping.categoryId },
      });
  }

  async delete(pluggyCategory: string): Promise<void> {
    await this.db
      .delete(pluggyCategoryMappings)
      .where(eq(pluggyCategoryMappings.pluggyCategory, pluggyCategory));
  }

  /** Só cria os que ainda não existem: um mapeamento que você mudou ou limpou não volta ao padrão. */
  async insertMissing(mappings: readonly PluggyCategoryMappingRecord[]): Promise<void> {
    if (mappings.length === 0) return;
    await this.db
      .insert(pluggyCategoryMappings)
      .values([...mappings])
      .onConflictDoNothing();
  }
}
