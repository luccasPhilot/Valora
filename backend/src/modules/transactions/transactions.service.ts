import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { NotFoundError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { BudgetAlertRefresher } from '../alerts/budget-alert-refresher.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import { assertCategoryIsSelectable } from '../categories/category-availability.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import type {
  TransactionSummary,
  TransactionTotalsRepository,
} from './transaction-totals.repository.js';
import type { TransactionType } from './transaction-type-filter.js';
import type {
  PageRequest,
  TransactionFilters,
  TransactionPage,
  TransactionRecord,
  TransactionSource,
  TransactionsQueryRepository,
} from './transactions.repository.js';

export interface TransactionListFilters {
  readonly from?: string;
  readonly to?: string;
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly source?: TransactionSource;
  readonly possibleDuplicate?: boolean;
  readonly search?: string;
}

export interface CategoryChange {
  readonly categoryId: string;
  /** Cria (ou atualiza) a regra "igual a esta descrição" e a aplica ao histórico. */
  readonly applyAlways: boolean;
}

export interface TransactionsServiceDependencies {
  readonly transactions: TransactionsQueryRepository;
  readonly totals: Pick<TransactionTotalsRepository, 'summarize'>;
  readonly categories: CategoriesRepository;
  readonly rules: Pick<CategoryRulesService, 'learnFromCorrection'>;
  readonly budgetAlerts: Pick<BudgetAlertRefresher, 'refresh'>;
  readonly now: () => Date;
}

export class TransactionsService {
  constructor(private readonly deps: TransactionsServiceDependencies) {}

  list(filters: TransactionListFilters, page: PageRequest): Promise<TransactionPage> {
    return this.deps.transactions.findPage(this.toRepositoryFilters(filters), page);
  }

  /** Mesmos filtros da lista: receita, despesa e quantidade de todo o filtro, não só da página. */
  summarize(filters: TransactionListFilters): Promise<TransactionSummary> {
    return this.deps.totals.summarize(this.toRepositoryFilters(filters));
  }

  /** As mais recentes de qualquer período, tipo e origem (o Início usa as 5 últimas). */
  async latest(limit: number): Promise<TransactionRecord[]> {
    const { items } = await this.deps.transactions.findPage({}, { page: 1, limit });
    return items;
  }

  async get(transactionId: string): Promise<TransactionRecord> {
    const transaction = await this.deps.transactions.findById(transactionId);
    if (!transaction) throw new NotFoundError(`Transação ${transactionId} não existe`);
    return transaction;
  }

  async changeCategory(transactionId: string, change: CategoryChange): Promise<TransactionRecord> {
    await assertCategoryIsSelectable(this.deps.categories, change.categoryId);
    const wasChanged = await this.deps.transactions.setUserCategory(
      transactionId,
      change.categoryId,
    );
    if (!wasChanged) throw new NotFoundError(`Transação ${transactionId} não existe`);
    // A transação já é "escolha do usuário", então o recálculo da regra não a sobrescreve.
    if (change.applyAlways) {
      await this.deps.rules.learnFromCorrection(transactionId, change.categoryId);
    }
    // Trocar a categoria (e o "Aplicar sempre", que recategoriza o histórico) muda o gasto dos orçamentos.
    await this.deps.budgetAlerts.refresh();
    return this.get(transactionId);
  }

  private toRepositoryFilters(filters: TransactionListFilters): TransactionFilters {
    const { search, ...otherFilters } = filters;
    const normalizedSearch = search ? normalizeDescription(search) : undefined;
    return { ...this.withDefaultPeriod(otherFilters), normalizedSearch };
  }

  /** Sem nenhuma das duas datas, a lista é do mês atual (fuso de São Paulo). */
  private withDefaultPeriod<Filters extends { from?: string; to?: string }>(
    filters: Filters,
  ): Filters {
    if (filters.from || filters.to) return filters;
    const today = todayInSaoPaulo(this.deps.now());
    return { ...filters, from: firstDayOfMonth(today), to: lastDayOfMonth(today) };
  }
}
