import type { Db, DbExecutor } from '../../db/database.js';
import { ConnectionsRepository } from '../connections/connections.repository.js';
import { AccountsRepository } from './accounts.repository.js';
import { InvestmentsRepository } from './investments.repository.js';
import { TransactionsRepository } from './transactions.repository.js';

export interface ItemRepositories {
  readonly accounts: AccountsRepository;
  readonly transactions: TransactionsRepository;
  readonly investments: InvestmentsRepository;
  readonly connections: ConnectionsRepository;
}

function createItemRepositories(executor: DbExecutor): ItemRepositories {
  return {
    accounts: new AccountsRepository(executor),
    transactions: new TransactionsRepository(executor),
    investments: new InvestmentsRepository(executor),
    connections: new ConnectionsRepository(executor),
  };
}

/** Grava tudo de um banco numa transação só: se algo falhar, nada daquele banco fica gravado. */
export class SyncUnitOfWork {
  constructor(private readonly db: Db) {}

  run<T>(work: (repositories: ItemRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(createItemRepositories(tx)));
  }
}
