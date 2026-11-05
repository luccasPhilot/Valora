import type { Database } from '../../db/database.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import { TransactionsQueryRepository } from './transactions.repository.js';
import { TransactionsService } from './transactions.service.js';

export interface TransactionsModuleDependencies {
  readonly database: Database;
  readonly categoryRulesService: CategoryRulesService;
  readonly now: () => Date;
}

export function createTransactionsService(
  deps: TransactionsModuleDependencies,
): TransactionsService {
  return new TransactionsService({
    transactions: new TransactionsQueryRepository(deps.database.db),
    categories: new CategoriesRepository(deps.database.db),
    rules: deps.categoryRulesService,
    now: deps.now,
  });
}
