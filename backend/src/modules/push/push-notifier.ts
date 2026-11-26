import { todayInSaoPaulo } from '../../shared/dates.js';
import type { TransactionReviewRepository } from '../transactions/transaction-review.repository.js';
import type { PushService } from './push.service.js';
import { newAlertsPush, REVIEW_INBOX_PUSH } from './push-messages.js';

/** A caixa "Para revisar" só vira aviso quando está cheia assim. */
export const REVIEW_INBOX_PUSH_THRESHOLD = 10;

export interface PushNotifierLogger {
  error(details: Record<string, unknown>, message: string): void;
}

export interface PushNotifierDependencies {
  readonly push: Pick<PushService, 'isEnabled' | 'broadcast'>;
  readonly reviews: Pick<TransactionReviewRepository, 'countUnreviewed'>;
  readonly logger: PushNotifierLogger;
  readonly now: () => Date;
}

function errorTypeOf(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/**
 * Decide quando mandar push. Nunca lança: uma falha aqui não pode derrubar a sincronização nem a
 * gravação do usuário, então vira só o tipo do erro no log.
 */
export class PushNotifier {
  // Em memória: um reinício no mesmo dia pode repetir o aviso da caixa uma vez, o que é aceito.
  private lastReviewInboxNoticeDay: string | null = null;

  constructor(private readonly deps: PushNotifierDependencies) {}

  /** Chamado uma vez por avaliação de alertas, com os tipos dos alertas que acabaram de nascer. */
  async notifyNewAlerts(types: readonly string[]): Promise<void> {
    if (types.length === 0 || !this.deps.push.isEnabled) return;
    try {
      await this.deps.push.broadcast(newAlertsPush(types));
    } catch (error) {
      this.deps.logger.error({ errorType: errorTypeOf(error) }, 'push for new alerts failed');
    }
  }

  /** Chamado ao fim da sincronização agendada: no máximo um aviso da caixa por dia. */
  async notifyReviewInboxIfFull(): Promise<void> {
    if (!this.deps.push.isEnabled) return;
    try {
      const today = todayInSaoPaulo(this.deps.now());
      if (this.lastReviewInboxNoticeDay === today) return;
      if ((await this.deps.reviews.countUnreviewed()) < REVIEW_INBOX_PUSH_THRESHOLD) return;
      this.lastReviewInboxNoticeDay = today;
      await this.deps.push.broadcast(REVIEW_INBOX_PUSH);
    } catch (error) {
      this.deps.logger.error({ errorType: errorTypeOf(error) }, 'push for review inbox failed');
    }
  }
}
