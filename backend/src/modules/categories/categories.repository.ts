import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { categories, transactions } from '../../db/schema.js';
import type { CategoryKind, DefaultCategory } from './seed/default-categories.js';

const categoryKindSchema = z.enum(['expense', 'income', 'transfer']);

export interface CategoryRecord {
  readonly id: string;
  readonly seedKey: string | null;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly icon: string;
  readonly isArchived: boolean;
}

export interface CategoryFields {
  readonly name: string;
  readonly kind: CategoryKind;
  readonly icon: string;
}

function toRecord(row: typeof categories.$inferSelect): CategoryRecord {
  return {
    id: row.id,
    seedKey: row.seedKey,
    name: row.name,
    kind: categoryKindSchema.parse(row.kind),
    icon: row.icon,
    isArchived: row.isArchived,
  };
}

export class CategoriesRepository {
  constructor(private readonly db: DbExecutor) {}

  async findAll(options: { readonly includeArchived: boolean }): Promise<CategoryRecord[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(options.includeArchived ? undefined : eq(categories.isArchived, false))
      .orderBy(asc(categories.name));
    return rows.map(toRecord);
  }

  async findById(categoryId: string): Promise<CategoryRecord | null> {
    const [row] = await this.db.select().from(categories).where(eq(categories.id, categoryId));
    return row ? toRecord(row) : null;
  }

  /** Sem diferenciar maiúsculas: "lazer" e "Lazer" são o mesmo nome para quem usa a tela. */
  async existsWithName(name: string, exceptCategoryId?: string): Promise<boolean> {
    const sameName = sql`lower(${categories.name}) = lower(${name})`;
    const condition = exceptCategoryId
      ? and(sameName, ne(categories.id, exceptCategoryId))
      : sameName;
    const rows = await this.db.select({ id: categories.id }).from(categories).where(condition);
    return rows.length > 0;
  }

  async countTransactions(categoryId: string): Promise<number> {
    return this.db.$count(transactions, eq(transactions.categoryId, categoryId));
  }

  async insert(fields: CategoryFields): Promise<CategoryRecord> {
    const [row] = await this.db.insert(categories).values(fields).returning();
    if (!row) throw new Error('A categoria não foi gravada');
    return toRecord(row);
  }

  async update(categoryId: string, fields: CategoryFields): Promise<CategoryRecord | null> {
    const [row] = await this.db
      .update(categories)
      .set(fields)
      .where(eq(categories.id, categoryId))
      .returning();
    return row ? toRecord(row) : null;
  }

  async archive(categoryId: string): Promise<CategoryRecord | null> {
    const [row] = await this.db
      .update(categories)
      .set({ isArchived: true })
      .where(eq(categories.id, categoryId))
      .returning();
    return row ? toRecord(row) : null;
  }

  /**
   * Cria as categorias padrão cuja chave ainda não existe e devolve só as criadas agora. Procura pela
   * chave, nunca pelo nome: uma categoria renomeada ou arquivada por você não é recriada. Um nome já
   * usado por outra categoria também faz o seed pular aquela (sem derrubar o resto).
   */
  async insertMissingDefaults(defaults: readonly DefaultCategory[]): Promise<CategoryRecord[]> {
    const rows = await this.db
      .insert(categories)
      .values(defaults.map(({ seedKey, name, kind, icon }) => ({ seedKey, name, kind, icon })))
      .onConflictDoNothing()
      .returning();
    return rows.map(toRecord);
  }
}
