import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { NotFoundError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import { assertCategoryIsSelectable } from '../categories/category-availability.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import type { TransactionType } from './transaction-type-filter.js';
import type {
  PageRequest,
  TransactionPage,
  TransactionRecord,
  TransactionsQueryRepository,
} from './transactions.repository.js';

export interface TransactionListFilters {
  readonly from?: string;
  readonly to?: string;
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly search?: string;
}

export interface CategoryChange {
  readonly categoryId: string;
  /** Cria (ou atualiza) a regra "igual a esta descrição" e a aplica ao histórico. */
  readonly applyAlways: boolean;
}

export interface TransactionsServiceDependencies {
  readonly transactions: TransactionsQueryRepository;
  readonly categories: CategoriesRepository;
  readonly rules: Pick<CategoryRulesService, 'learnFromCorrection'>;
  readonly now: () => Date;
}

export class TransactionsService {
  constructor(private readonly deps: TransactionsServiceDependencies) {}

  list(filters: TransactionListFilters, page: PageRequest): Promise<TransactionPage> {
    const { search, ...otherFilters } = filters;
    const normalizedSearch = search ? normalizeDescription(search) : undefined;
    return this.deps.transactions.findPage(
      { ...this.withDefaultPeriod(otherFilters), normalizedSearch },
      page,
    );
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
    return this.get(transactionId);
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
