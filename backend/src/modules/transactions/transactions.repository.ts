import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, categories, transactions } from '../../db/schema.js';
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

export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

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
  };
}

export class TransactionsQueryRepository {
  constructor(private readonly db: DbExecutor) {}

  async findPage(filters: TransactionFilters, request: PageRequest): Promise<TransactionPage> {
    const where = and(...buildConditions(filters));
    const rows = await selectTransactions(this.db)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id))
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

  /** Grava a categoria como escolha sua. Devolve `false` se a transação não existe. */
  async setUserCategory(transactionId: string, categoryId: string): Promise<boolean> {
    const rows = await this.db
      .update(transactions)
      .set({ categoryId, categorySource: 'user', updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }
}
