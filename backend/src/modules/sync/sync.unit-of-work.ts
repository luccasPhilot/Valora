import type { Db, DbExecutor } from '../../db/database.js';
import { createCategorizerRepositories } from '../categories/categories.module.js';
import { Categorizer } from '../categories/categorizer.js';
import { ConnectionsRepository } from '../connections/connections.repository.js';
import { DuplicateDetector } from '../transactions/duplicate-detector.js';
import { PossibleDuplicatesRepository } from '../transactions/possible-duplicates.repository.js';
import { AccountsRepository } from './accounts.repository.js';
import { CreditCardBillsRepository } from './credit-card-bills.repository.js';
import { InvestmentsRepository } from './investments.repository.js';
import { TransactionsRepository } from './transactions.repository.js';

export interface ItemRepositories {
  readonly accounts: AccountsRepository;
  readonly transactions: TransactionsRepository;
  readonly investments: InvestmentsRepository;
  readonly creditCardBills: CreditCardBillsRepository;
  readonly connections: ConnectionsRepository;
  readonly categorizer: Categorizer;
  readonly duplicateDetector: DuplicateDetector;
}

function createItemRepositories(executor: DbExecutor): ItemRepositories {
  return {
    accounts: new AccountsRepository(executor),
    transactions: new TransactionsRepository(executor),
    investments: new InvestmentsRepository(executor),
    creditCardBills: new CreditCardBillsRepository(executor),
    connections: new ConnectionsRepository(executor),
    categorizer: new Categorizer(createCategorizerRepositories(executor)),
    duplicateDetector: new DuplicateDetector(new PossibleDuplicatesRepository(executor)),
  };
}

/** Grava tudo de um banco numa transação só: se algo falhar, nada daquele banco fica gravado. */
export class SyncUnitOfWork {
  constructor(private readonly db: Db) {}

  run<T>(work: (repositories: ItemRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(createItemRepositories(tx)));
  }
}
