import type { Database } from '../../db/database.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import type { BudgetAlertRefresher } from '../alerts/budget-alert-refresher.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import type { RuleSuggestionsService } from '../categories/rule-suggestions.service.js';
import { TagsRepository } from '../tags/tags.repository.js';
import { DuplicatesService } from './duplicates.service.js';
import { PossibleDuplicatesRepository } from './possible-duplicates.repository.js';
import { TransactionAnnotationsRepository } from './transaction-annotations.repository.js';
import { TransactionReviewRepository } from './transaction-review.repository.js';
import { TransactionReviewService } from './transaction-review.service.js';
import { TransactionTotalsRepository } from './transaction-totals.repository.js';
import { TransactionWritesService } from './transaction-writes.service.js';
import { TransactionsQueryRepository } from './transactions.repository.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsWriteRepository } from './transactions-write.repository.js';

export interface TransactionsModuleDependencies {
  readonly database: Database;
  readonly categoryRulesService: CategoryRulesService;
  readonly ruleSuggestionsService: Pick<RuleSuggestionsService, 'suggestionFor'>;
  readonly budgetAlerts: Pick<BudgetAlertRefresher, 'refresh'>;
  readonly now: () => Date;
}

export interface TransactionsModule {
  readonly transactionsService: TransactionsService;
  readonly writesService: TransactionWritesService;
  readonly duplicatesService: DuplicatesService;
  readonly reviewService: TransactionReviewService;
}

export function createTransactionsModule(deps: TransactionsModuleDependencies): TransactionsModule {
  const { db } = deps.database;
  const categories = new CategoriesRepository(db);
  const transactionsService = new TransactionsService({
    transactions: new TransactionsQueryRepository(db),
    totals: new TransactionTotalsRepository(db),
    categories,
    rules: deps.categoryRulesService,
    suggestions: deps.ruleSuggestionsService,
    budgetAlerts: deps.budgetAlerts,
    now: deps.now,
  });
  return {
    transactionsService,
    writesService: new TransactionWritesService({
      reads: transactionsService,
      writes: new TransactionsWriteRepository(db),
      annotations: new TransactionAnnotationsRepository(db),
      tags: new TagsRepository(db),
      categories,
      accounts: new AccountsRepository(db),
      rules: deps.categoryRulesService,
      suggestions: deps.ruleSuggestionsService,
      budgetAlerts: deps.budgetAlerts,
      now: deps.now,
    }),
    duplicatesService: new DuplicatesService({
      duplicates: new PossibleDuplicatesRepository(db),
      transactions: transactionsService,
      budgetAlerts: deps.budgetAlerts,
    }),
    reviewService: new TransactionReviewService({
      reviews: new TransactionReviewRepository(db),
      now: deps.now,
    }),
  };
}
