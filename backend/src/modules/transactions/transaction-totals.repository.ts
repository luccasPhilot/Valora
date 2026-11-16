import type { SQL } from 'drizzle-orm';
import { and, between, count, eq, min, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { categories, transactions } from '../../db/schema.js';
import type { MonthTotals } from '../../shared/months.js';
import { buildConditions, type TransactionFilters } from './transaction-filter-conditions.js';
import { transactionTypeCondition } from './transaction-type-filter.js';

export interface TransactionSummary {
  readonly incomeCents: number;
  /** Positivo, como no Início. */
  readonly expenseCents: number;
  readonly count: number;
}

export interface CategorySpending {
  /** Nulo nas despesas sem categoria. */
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly categoryIcon: string | null;
  readonly spentCents: number;
}

export interface MonthCategorySpending extends CategorySpending {
  /** `AAAA-MM`. */
  readonly month: string;
}

// Mesma regra de gasto líquido dos orçamentos: estorno na categoria reduz o gasto.
const netSpentCents = sql`greatest(0, -coalesce(sum(${transactions.amountCents}), 0))`.mapWith(
  Number,
);

// Sem transferências internas; sem categoria, só a saída é despesa (a entrada é receita).
function isCategorySpendingIn(from: string, to: string): SQL | undefined {
  return and(
    between(transactions.date, from, to),
    sql`${categories.kind} is distinct from 'transfer'`,
    sql`(${transactions.categoryId} is not null or ${transactions.amountCents} < 0)`,
  );
}

// O `sum` de bigint volta como texto do PostgreSQL; `mapWith(Number)` converte, e os centavos cabem num inteiro seguro.
function sumCentsWhere(condition: SQL): SQL<number> {
  return sql`coalesce(sum(case when ${condition} then ${transactions.amountCents} else 0 end), 0)`.mapWith(
    Number,
  );
}

/** Única definição de "receita" e "despesa" do mês: o Início e os relatórios leem daqui. */
export class TransactionTotalsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Receitas e despesas por mês (sem transferências). Meses sem transações não vêm. */
  async findMonthTotals(from: string, to: string): Promise<MonthTotals[]> {
    const month = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;
    return this.db
      .select({
        month,
        incomeCents: sumCentsWhere(transactionTypeCondition('income')),
        expenseCents: sql`-${sumCentsWhere(transactionTypeCondition('expense'))}`.mapWith(Number),
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(between(transactions.date, from, to))
      .groupBy(month)
      .orderBy(month);
  }

  /**
   * Receitas, despesas (positivas) e quantidade das transações de um filtro. As transferências
   * ficam fora de receita e despesa, mas entram na quantidade, igual a `pagination.total` da lista.
   */
  async summarize(filters: TransactionFilters): Promise<TransactionSummary> {
    const [row] = await this.db
      .select({
        incomeCents: sumCentsWhere(transactionTypeCondition('income')),
        expenseCents: sql`-${sumCentsWhere(transactionTypeCondition('expense'))}`.mapWith(Number),
        count: count(),
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(...buildConditions(filters)));
    return row ?? { incomeCents: 0, expenseCents: 0, count: 0 };
  }

  /** Gasto líquido por categoria no período; a categoria nula agrupa as despesas sem categoria. */
  async findCategorySpending(from: string, to: string): Promise<CategorySpending[]> {
    return this.db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        spentCents: netSpentCents,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(isCategorySpendingIn(from, to))
      .groupBy(categories.id, categories.name, categories.icon)
      .having(sql`${netSpentCents} > 0`);
  }

  /**
   * Como `findCategorySpending`, mas por mês: o gasto líquido de cada par mês e categoria (mínimo de
   * zero em cada mês). Pares sem gasto não vêm.
   */
  async findCategorySpendingByMonth(from: string, to: string): Promise<MonthCategorySpending[]> {
    const month = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;
    return this.db
      .select({
        month,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        spentCents: netSpentCents,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(isCategorySpendingIn(from, to))
      .groupBy(month, categories.id, categories.name, categories.icon)
      .having(sql`${netSpentCents} > 0`)
      .orderBy(month);
  }

  /** Dia (`AAAA-MM-DD`) da transação mais antiga guardada; nulo sem nenhuma transação. */
  async findFirstTransactionDay(): Promise<string | null> {
    const [row] = await this.db.select({ date: min(transactions.date) }).from(transactions);
    return row?.date ?? null;
  }
}
