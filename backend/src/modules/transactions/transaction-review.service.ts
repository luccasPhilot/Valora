import { ValidationError } from '../../shared/errors.js';
import type { TransactionReviewRepository } from './transaction-review.repository.js';

export interface TransactionReviewDependencies {
  readonly reviews: TransactionReviewRepository;
  readonly now: () => Date;
}

/** A caixa "Para revisar": quantas faltam e marcar como revisadas. */
export class TransactionReviewService {
  constructor(private readonly deps: TransactionReviewDependencies) {}

  countUnreviewed(): Promise<number> {
    return this.deps.reviews.countUnreviewed();
  }

  markReviewed(transactionIds: readonly string[]): Promise<number> {
    return this.deps.reviews.markReviewed(transactionIds);
  }

  /**
   * "Marcar tudo como revisado": `until` é o `loadedAt` da lista que estava na tela, para nunca
   * marcar o que chegou depois de ela ser carregada.
   */
  markInboxReviewedUntil(until: Date): Promise<number> {
    if (until > this.deps.now()) {
      throw new ValidationError(`O instante ${until.toISOString()} está no futuro`, {
        details: [{ field: 'until', message: 'O instante não pode ser no futuro' }],
      });
    }
    return this.deps.reviews.markInboxReviewedUntil(until);
  }
}
