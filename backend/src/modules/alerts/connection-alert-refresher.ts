import type { AlertEvaluator } from './alert-evaluator.js';
import type { AlertsLogger } from './budget-alert-refresher.js';

/**
 * Reavalia os alertas de conexão depois de o usuário arquivar ou reativar um banco. Nunca lança:
 * a falha vira log e a operação principal segue como se nada tivesse acontecido.
 */
export class ConnectionAlertRefresher {
  constructor(
    private readonly evaluator: Pick<AlertEvaluator, 'evaluateConnections'>,
    private readonly logger: AlertsLogger,
  ) {}

  async refresh(): Promise<void> {
    try {
      await this.evaluator.evaluateConnections();
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'unknown';
      this.logger.error({ errorType }, 'connection alerts refresh failed');
    }
  }
}
