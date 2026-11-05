import { and, eq, gte, lte, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { budgets, categories, transactions } from '../../db/schema.js';
import { lastDayOfMonth } from '../../shared/dates.js';

export interface BudgetRecord {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryIcon: string;
  readonly limitCents: number;
  readonly spentCents: number;
}

// Gasto líquido: a soma com o sinal invertido, com mínimo de zero. Estorno (valor positivo) reduz o gasto.
// O `sum` de bigint volta como texto do PostgreSQL; `mapWith(Number)` converte, e os centavos cabem num inteiro seguro.
const netSpentCents = sql`greatest(0, -coalesce(sum(${transactions.amountCents}), 0))`.mapWith(
  Number,
);

export class BudgetsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Limites do mês com o gasto de cada categoria (todas as origens e status). `month` é o dia 1. */
  async findForMonth(month: string, categoryId?: string): Promise<BudgetRecord[]> {
    return this.db
      .select({
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        limitCents: budgets.limitCents,
        spentCents: netSpentCents,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, budgets.categoryId),
          gte(transactions.date, month),
          lte(transactions.date, lastDayOfMonth(month)),
        ),
      )
      .where(
        and(eq(budgets.month, month), categoryId ? eq(budgets.categoryId, categoryId) : undefined),
      )
      .groupBy(budgets.id, categories.id);
  }

  async upsertLimit(categoryId: string, month: string, limitCents: number): Promise<void> {
    await this.db
      .insert(budgets)
      .values({ categoryId, month, limitCents })
      .onConflictDoUpdate({ target: [budgets.categoryId, budgets.month], set: { limitCents } });
  }

  /** Devolve `false` quando não havia limite para remover. */
  async deleteLimit(categoryId: string, month: string): Promise<boolean> {
    const rows = await this.db
      .delete(budgets)
      .where(and(eq(budgets.categoryId, categoryId), eq(budgets.month, month)))
      .returning({ id: budgets.id });
    return rows.length > 0;
  }

  /**
   * Copia os limites de `sourceMonth` para `targetMonth` numa query só. Só entram categorias ativas
   * e sem limite no mês de destino (o `ON CONFLICT` nunca sobrescreve). Devolve quantos foram copiados.
   */
  async copyLimits(sourceMonth: string, targetMonth: string): Promise<number> {
    const rows = await this.db
      .insert(budgets)
      .select(
        this.db
          // O Drizzle exige todas as colunas da tabela, na ordem dela, inclusive o `id`.
          .select({
            id: sql<string>`gen_random_uuid()`.as('id'),
            categoryId: budgets.categoryId,
            month: sql<string>`${targetMonth}::date`.as('month'),
            limitCents: budgets.limitCents,
          })
          .from(budgets)
          .innerJoin(categories, eq(categories.id, budgets.categoryId))
          .where(and(eq(budgets.month, sourceMonth), eq(categories.isArchived, false))),
      )
      .onConflictDoNothing()
      .returning({ id: budgets.id });
    return rows.length;
  }
}
