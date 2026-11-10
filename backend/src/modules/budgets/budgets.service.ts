import { firstDayOfMonth, firstDayOfPreviousMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { BudgetAlertRefresher } from '../alerts/budget-alert-refresher.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import { budgetPercent, type BudgetStatus, budgetStatus } from './budget-status.js';
import type { BudgetRecord, BudgetsRepository } from './budgets.repository.js';

export interface BudgetItem {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryIcon: string;
  readonly limitCents: number;
  readonly spentCents: number;
  readonly percent: number;
  readonly status: BudgetStatus;
}

export interface BudgetOverview {
  readonly month: string;
  readonly items: readonly BudgetItem[];
  readonly totals: { readonly limitCents: number; readonly spentCents: number };
}

export interface BudgetsServiceDependencies {
  readonly budgets: BudgetsRepository;
  readonly categories: CategoriesRepository;
  readonly budgetAlerts: Pick<BudgetAlertRefresher, 'refresh'>;
  readonly now: () => Date;
}

function toItem(record: BudgetRecord): BudgetItem {
  return {
    ...record,
    percent: budgetPercent(record.spentCents, record.limitCents),
    status: budgetStatus(record.spentCents, record.limitCents),
  };
}

// Só ordena a lista; o status nunca vem deste valor. Empate pelo nome, para a ordem não mudar sozinha.
function compareByUsage(first: BudgetRecord, second: BudgetRecord): number {
  const usageDifference =
    second.spentCents / second.limitCents - first.spentCents / first.limitCents;
  return usageDifference || first.categoryName.localeCompare(second.categoryName, 'pt-BR');
}

export class BudgetsService {
  constructor(private readonly deps: BudgetsServiceDependencies) {}

  /** `month` é o dia 1 do mês; sem ele, vale o mês atual no fuso de São Paulo. */
  async overview(month: string = this.currentMonth()): Promise<BudgetOverview> {
    const records = await this.deps.budgets.findForMonth(month);
    return {
      month,
      items: [...records].sort(compareByUsage).map(toItem),
      totals: {
        limitCents: records.reduce((sum, record) => sum + record.limitCents, 0),
        spentCents: records.reduce((sum, record) => sum + record.spentCents, 0),
      },
    };
  }

  async setLimit(categoryId: string, month: string, limitCents: number): Promise<BudgetItem> {
    await this.assertBudgetableCategory(categoryId);
    await this.deps.budgets.upsertLimit(categoryId, month, limitCents);
    await this.deps.budgetAlerts.refresh();
    const [record] = await this.deps.budgets.findForMonth(month, categoryId);
    if (!record) throw new Error(`O limite da categoria ${categoryId} não foi gravado`);
    return toItem(record);
  }

  async removeLimit(categoryId: string, month: string): Promise<void> {
    const wasRemoved = await this.deps.budgets.deleteLimit(categoryId, month);
    if (wasRemoved) await this.deps.budgetAlerts.refresh();
    if (!wasRemoved) {
      throw new NotFoundError(`A categoria ${categoryId} não tem limite em ${month.slice(0, 7)}`);
    }
  }

  /** Devolve quantos limites foram copiados do mês anterior. */
  async copyFromPreviousMonth(month: string): Promise<number> {
    const copied = await this.deps.budgets.copyLimits(firstDayOfPreviousMonth(month), month);
    if (copied > 0) await this.deps.budgetAlerts.refresh();
    return copied;
  }

  private currentMonth(): string {
    return firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
  }

  private async assertBudgetableCategory(categoryId: string): Promise<void> {
    const category = await this.deps.categories.findById(categoryId);
    if (!category) throw new NotFoundError(`Categoria ${categoryId} não encontrada`);
    if (category.kind !== 'expense' || category.isArchived) {
      throw new ValidationError(
        `A categoria "${category.name}" não aceita orçamento: só categorias de despesa ativas`,
        { details: [{ field: 'categoryId', message: 'Escolha uma categoria de despesa ativa' }] },
      );
    }
  }
}
