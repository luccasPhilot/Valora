import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, categories, tags, transactions, transactionTags } from '../../db/schema.js';
import {
  buildConditions,
  type TransactionFilters,
  transactionSourceSchema,
} from './transaction-filter-conditions.js';

export type { TransactionFilters, TransactionSource } from './transaction-filter-conditions.js';

const transactionStatusSchema = z.enum(['pending', 'posted']);
const categorySourceSchema = z.enum(['user', 'rule', 'pluggy', 'none']);
const categoryKindSchema = z.enum(['expense', 'income', 'transfer']);
const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash']);
const transactionTagsSchema = z.array(z.object({ id: z.uuid(), name: z.string() }));

// Uma subconsulta por linha dentro da mesma consulta: as etiquetas vêm sem N+1.
const tagsOfTransaction = sql<unknown>`coalesce((
  select json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}) order by ${tags.name})
  from ${transactionTags}
  inner join ${tags} on ${tags.id} = ${transactionTags.tagId}
  where ${transactionTags.transactionId} = ${transactions.id}
), '[]'::json)`;

export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

/** A lista mostra a mais recente primeiro; a caixa "Para revisar", a mais antiga. */
export type TransactionOrder = 'newest_first' | 'oldest_first';

const ORDER_COLUMNS = {
  newest_first: [desc(transactions.date), desc(transactions.createdAt), desc(transactions.id)],
  oldest_first: [asc(transactions.date), asc(transactions.createdAt), asc(transactions.id)],
} as const;

export interface TransactionRecord {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amountCents: number;
  readonly status: z.infer<typeof transactionStatusSchema>;
  readonly source: z.infer<typeof transactionSourceSchema>;
  readonly category: {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly kind: z.infer<typeof categoryKindSchema>;
  } | null;
  readonly categorySource: z.infer<typeof categorySourceSchema>;
  readonly account: {
    readonly id: string;
    readonly name: string;
    readonly type: z.infer<typeof accountTypeSchema>;
  };
  readonly installmentNumber: number | null;
  readonly installmentTotal: number | null;
  /** Na transação do banco marcada como possível duplicata: o id da manual parecida. */
  readonly possibleDuplicateOfId: string | null;
  readonly note: string | null;
  readonly tags: readonly { readonly id: string; readonly name: string }[];
}

export interface TransactionPage {
  readonly items: TransactionRecord[];
  readonly total: number;
}

function selectTransactions(db: DbExecutor) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amountCents: transactions.amountCents,
      status: transactions.status,
      source: transactions.source,
      categorySource: transactions.categorySource,
      installmentNumber: transactions.installmentNumber,
      installmentTotal: transactions.installmentTotal,
      possibleDuplicateOfId: transactions.possibleDuplicateOfId,
      note: transactions.note,
      tags: tagsOfTransaction.as('tag_list'),
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryKind: categories.kind,
      accountId: accounts.id,
      accountName: accounts.name,
      accountType: accounts.type,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId));
}

type TransactionRow = Awaited<ReturnType<typeof selectTransactions>>[number];

function toRecord(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amountCents: row.amountCents,
    status: transactionStatusSchema.parse(row.status),
    source: transactionSourceSchema.parse(row.source),
    category:
      row.categoryId === null
        ? null
        : {
            id: row.categoryId,
            name: z.string().parse(row.categoryName),
            icon: z.string().parse(row.categoryIcon),
            kind: categoryKindSchema.parse(row.categoryKind),
          },
    categorySource: categorySourceSchema.parse(row.categorySource),
    account: {
      id: row.accountId,
      name: row.accountName,
      type: accountTypeSchema.parse(row.accountType),
    },
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    possibleDuplicateOfId: row.possibleDuplicateOfId,
    note: row.note,
    tags: transactionTagsSchema.parse(row.tags),
  };
}

export class TransactionsQueryRepository {
  constructor(private readonly db: DbExecutor) {}

  async findPage(
    filters: TransactionFilters,
    request: PageRequest,
    order: TransactionOrder = 'newest_first',
  ): Promise<TransactionPage> {
    const where = and(...buildConditions(filters));
    const rows = await selectTransactions(this.db)
      .where(where)
      .orderBy(...ORDER_COLUMNS[order])
      .limit(request.limit)
      .offset((request.page - 1) * request.limit);
    const [counted] = await this.db
      .select({ total: count() })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where);
    return { items: rows.map(toRecord), total: counted?.total ?? 0 };
  }

  async findById(transactionId: string): Promise<TransactionRecord | null> {
    const [row] = await selectTransactions(this.db).where(eq(transactions.id, transactionId));
    return row ? toRecord(row) : null;
  }

  /** Grava a categoria como escolha sua e marca como revisada. `false` se a transação não existe. */
  async setUserCategory(transactionId: string, categoryId: string): Promise<boolean> {
    const rows = await this.db
      .update(transactions)
      .set({ categoryId, categorySource: 'user', reviewedAt: sql`now()`, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }

  /**
   * Troca em massa: grava a categoria como escolha sua e marca como revisadas, num comando só (ou
   * todas mudam, ou nenhuma). Ids que não existem são ignorados; devolve quantas mudaram.
   */
  async setUserCategoryOfMany(
    transactionIds: readonly string[],
    categoryId: string,
  ): Promise<number> {
    const rows = await this.db
      .update(transactions)
      .set({ categoryId, categorySource: 'user', reviewedAt: sql`now()`, updatedAt: new Date() })
      .where(inArray(transactions.id, [...transactionIds]))
      .returning({ id: transactions.id });
    return rows.length;
  }

  /** Valores (com sinal) das transações manuais entre os ids: a categoria precisa casar com o tipo. */
  async findManualAmounts(transactionIds: readonly string[]): Promise<number[]> {
    const rows = await this.db
      .select({ amountCents: transactions.amountCents })
      .from(transactions)
      .where(and(inArray(transactions.id, [...transactionIds]), eq(transactions.source, 'manual')));
    return rows.map((row) => row.amountCents);
  }
}
