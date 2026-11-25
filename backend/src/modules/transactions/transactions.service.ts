import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { NotFoundError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { BudgetAlertRefresher } from '../alerts/budget-alert-refresher.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import {
  assertCategoryIsSelectable,
  assertCategoryMatchesType,
} from '../categories/category-availability.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import type { RuleSuggestion } from '../categories/rule-suggestions.js';
import type { RuleSuggestionsService } from '../categories/rule-suggestions.service.js';
import { typeOfAmount } from './manual-transaction-fields.js';
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
  /** `false` é a caixa "Para revisar": sem período padrão e com a mais antiga primeiro. */
  readonly reviewed?: boolean;
}

export interface TransactionListResult extends TransactionPage {
  /** Instante do servidor antes da consulta: o limite de "Marcar tudo como revisado". */
  readonly loadedAt: Date;
}

export interface BulkCategoryChange {
  readonly transactionIds: readonly string[];
  readonly categoryId: string;
}

export interface BulkCategoryResult {
  readonly updatedCount: number;
  readonly ruleSuggestion: RuleSuggestion | null;
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
  readonly suggestions: Pick<RuleSuggestionsService, 'suggestionFor'>;
  readonly budgetAlerts: Pick<BudgetAlertRefresher, 'refresh'>;
  readonly now: () => Date;
}

export class TransactionsService {
  constructor(private readonly deps: TransactionsServiceDependencies) {}

  async list(filters: TransactionListFilters, page: PageRequest): Promise<TransactionListResult> {
    const loadedAt = this.deps.now();
    // Revisar na ordem em que aconteceu: a caixa começa pela mais antiga.
    const order = filters.reviewed === false ? 'oldest_first' : 'newest_first';
    const found = await this.deps.transactions.findPage(
      this.toRepositoryFilters(filters),
      page,
      order,
    );
    return { ...found, loadedAt };
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

  /**
   * Troca em massa, do Open Finance e manuais: tudo vira escolha sua e fica revisado. Sem "Aplicar
   * sempre": uma seleção de descrições diferentes não vira regra, a sugestão cobre o caso.
   */
  async changeCategoryOfMany(change: BulkCategoryChange): Promise<BulkCategoryResult> {
    await assertCategoryIsSelectable(this.deps.categories, change.categoryId);
    await this.assertManualTypesMatch(change);
    const updatedCount = await this.deps.transactions.setUserCategoryOfMany(
      change.transactionIds,
      change.categoryId,
    );
    await this.deps.budgetAlerts.refresh();
    const ruleSuggestion = await this.deps.suggestions.suggestionFor(
      change.transactionIds,
      change.categoryId,
    );
    return { updatedCount, ruleSuggestion };
  }

  /** Numa manual, a categoria precisa ser do tipo do valor, como na edição de uma só. */
  private async assertManualTypesMatch(change: BulkCategoryChange): Promise<void> {
    const amounts = await this.deps.transactions.findManualAmounts(change.transactionIds);
    const types = new Set(amounts.map(typeOfAmount));
    for (const type of types) {
      await assertCategoryMatchesType(this.deps.categories, change.categoryId, type);
    }
  }

  private toRepositoryFilters(filters: TransactionListFilters): TransactionFilters {
    const { search, ...otherFilters } = filters;
    const normalizedSearch = search ? normalizeDescription(search) : undefined;
    return { ...this.withDefaultPeriod(otherFilters), normalizedSearch };
  }

  /** Sem nenhuma das duas datas, a lista é do mês atual (fuso de São Paulo). A caixa não tem período. */
  private withDefaultPeriod<Filters extends { from?: string; to?: string; reviewed?: boolean }>(
    filters: Filters,
  ): Filters {
    if (filters.from || filters.to || filters.reviewed === false) return filters;
    const today = todayInSaoPaulo(this.deps.now());
    return { ...filters, from: firstDayOfMonth(today), to: lastDayOfMonth(today) };
  }
}
