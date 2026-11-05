import { and, between, eq, inArray, type SQL, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { balanceSnapshots, categories, transactions } from '../../db/schema.js';
import { transactionTypeCondition } from '../transactions/transaction-type-filter.js';

export interface BalancePoint {
  readonly date: string;
  readonly balanceCents: number;
}

export interface MonthTotals {
  /** `AAAA-MM`. */
  readonly month: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
}

export interface CategorySpending {
  /** Nulo nas despesas sem categoria. */
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly categoryIcon: string | null;
  readonly spentCents: number;
}

// O `sum` de bigint volta como texto do PostgreSQL; `mapWith(Number)` converte, e os centavos cabem num inteiro seguro.
function sumCentsWhere(condition: SQL): SQL<number> {
  return sql`coalesce(sum(case when ${condition} then ${transactions.amountCents} else 0 end), 0)`.mapWith(
    Number,
  );
}

// Mesma regra de gasto líquido dos orçamentos: estorno na categoria reduz o gasto.
const netSpentCents = sql`greatest(0, -coalesce(sum(${transactions.amountCents}), 0))`.mapWith(
  Number,
);

export class DashboardRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Soma diária das fotos das contas dadas, só dos dias que têm foto. */
  async findBalanceEvolution(
    accountIds: readonly string[],
    from: string,
    to: string,
  ): Promise<BalancePoint[]> {
    if (accountIds.length === 0) return [];
    return this.db
      .select({
        date: balanceSnapshots.date,
        balanceCents: sql`sum(${balanceSnapshots.balanceCents})`.mapWith(Number),
      })
      .from(balanceSnapshots)
      .where(
        and(
          inArray(balanceSnapshots.accountId, [...accountIds]),
          between(balanceSnapshots.date, from, to),
        ),
      )
      .groupBy(balanceSnapshots.date)
      .orderBy(balanceSnapshots.date);
  }

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
      .where(
        and(
          between(transactions.date, from, to),
          sql`${categories.kind} is distinct from 'transfer'`,
          // Sem categoria, só a saída é despesa; a entrada é receita.
          sql`(${transactions.categoryId} is not null or ${transactions.amountCents} < 0)`,
        ),
      )
      .groupBy(categories.id, categories.name, categories.icon)
      .having(sql`${netSpentCents} > 0`);
  }
}
