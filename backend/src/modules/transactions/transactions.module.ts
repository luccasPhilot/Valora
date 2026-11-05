import type { Database } from '../../db/database.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import { DuplicatesService } from './duplicates.service.js';
import { PossibleDuplicatesRepository } from './possible-duplicates.repository.js';
import { TransactionWritesService } from './transaction-writes.service.js';
import { TransactionsQueryRepository } from './transactions.repository.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsWriteRepository } from './transactions-write.repository.js';

export interface TransactionsModuleDependencies {
  readonly database: Database;
  readonly categoryRulesService: CategoryRulesService;
  readonly now: () => Date;
}

export interface TransactionsModule {
  readonly transactionsService: TransactionsService;
  readonly writesService: TransactionWritesService;
  readonly duplicatesService: DuplicatesService;
}

export function createTransactionsModule(deps: TransactionsModuleDependencies): TransactionsModule {
  const { db } = deps.database;
  const categories = new CategoriesRepository(db);
  const transactionsService = new TransactionsService({
    transactions: new TransactionsQueryRepository(db),
    categories,
    rules: deps.categoryRulesService,
    now: deps.now,
  });
  return {
    transactionsService,
    writesService: new TransactionWritesService({
      reads: transactionsService,
      writes: new TransactionsWriteRepository(db),
      categories,
      accounts: new AccountsRepository(db),
      rules: deps.categoryRulesService,
      now: deps.now,
    }),
    duplicatesService: new DuplicatesService({
      duplicates: new PossibleDuplicatesRepository(db),
      transactions: transactionsService,
    }),
  };
}
