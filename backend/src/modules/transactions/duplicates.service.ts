import { NoDuplicatePendingError, NotFoundError } from '../../shared/errors.js';
import type { PossibleDuplicatesRepository } from './possible-duplicates.repository.js';
import type { TransactionRecord } from './transactions.repository.js';
import type { TransactionsService } from './transactions.service.js';

export type DuplicateResolutionAction = 'merge' | 'keep_both';

export interface DuplicatesServiceDependencies {
  readonly duplicates: PossibleDuplicatesRepository;
  readonly transactions: Pick<TransactionsService, 'get'>;
}

export class DuplicatesService {
  constructor(private readonly deps: DuplicatesServiceDependencies) {}

  /** Resolve a marcação da transação do Open Finance e devolve essa transação já atualizada. */
  async resolve(
    transactionId: string,
    action: DuplicateResolutionAction,
  ): Promise<TransactionRecord> {
    const pending = await this.deps.duplicates.findPendingManualId(transactionId);
    if (!pending) throw new NotFoundError(`Transação ${transactionId} não existe`);
    if (pending.manualId === null) {
      throw new NoDuplicatePendingError(
        `A transação ${transactionId} não tem possível duplicata pendente`,
      );
    }
    if (action === 'merge') {
      await this.deps.duplicates.merge(transactionId, pending.manualId);
    } else {
      await this.deps.duplicates.clearMark(transactionId);
    }
    return this.deps.transactions.get(transactionId);
  }
}
