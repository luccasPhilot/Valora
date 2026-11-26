import { and, asc, count, eq, inArray, ne, type SQL } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { tags, transactionTags } from '../../db/schema.js';

export interface TagRecord {
  readonly id: string;
  readonly name: string;
  readonly transactionCount: number;
}

function selectTagsWithCount(db: DbExecutor) {
  return db
    .select({ id: tags.id, name: tags.name, transactionCount: count(transactionTags.tagId) })
    .from(tags)
    .leftJoin(transactionTags, eq(transactionTags.tagId, tags.id))
    .groupBy(tags.id, tags.name);
}

export class TagsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Todas por nome, com quantas transações usam cada uma. */
  findAll(): Promise<TagRecord[]> {
    return selectTagsWithCount(this.db).orderBy(asc(tags.name));
  }

  async findById(tagId: string): Promise<TagRecord | null> {
    const [row] = await selectTagsWithCount(this.db).where(eq(tags.id, tagId));
    return row ?? null;
  }

  async existsWithNormalizedName(nameNormalized: string, exceptTagId?: string): Promise<boolean> {
    const conditions: SQL[] = [eq(tags.nameNormalized, nameNormalized)];
    if (exceptTagId) conditions.push(ne(tags.id, exceptTagId));
    const [row] = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(and(...conditions))
      .limit(1);
    return row !== undefined;
  }

  async insert(name: string, nameNormalized: string): Promise<string> {
    const [row] = await this.db
      .insert(tags)
      .values({ name, nameNormalized })
      .returning({ id: tags.id });
    if (!row) throw new Error('A etiqueta não foi gravada');
    return row.id;
  }

  async rename(tagId: string, name: string, nameNormalized: string): Promise<boolean> {
    const rows = await this.db
      .update(tags)
      .set({ name, nameNormalized })
      .where(eq(tags.id, tagId))
      .returning({ id: tags.id });
    return rows.length > 0;
  }

  /** As ligações com as transações saem junto (`ON DELETE CASCADE`); as transações ficam. */
  async delete(tagId: string): Promise<boolean> {
    const rows = await this.db.delete(tags).where(eq(tags.id, tagId)).returning({ id: tags.id });
    return rows.length > 0;
  }

  /** Dos ids pedidos, os que existem. */
  async findExistingIds(tagIds: readonly string[]): Promise<string[]> {
    if (tagIds.length === 0) return [];
    const rows = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, [...tagIds]));
    return rows.map((row) => row.id);
  }
}
