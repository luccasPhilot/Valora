import type { AlertEvaluator } from './alert-evaluator.js';

/** Logger mínimo (compatível com o do Fastify). Recebe só o tipo do erro, nunca valores. */
export interface AlertsLogger {
  error(details: Record<string, unknown>, message: string): void;
}

/**
 * Reavalia os alertas de orçamento depois de uma gravação do usuário que muda gasto ou limite.
 * Nunca lança: a falha vira log e a operação principal segue como se nada tivesse acontecido.
 */
export class BudgetAlertRefresher {
  constructor(
    private readonly evaluator: Pick<AlertEvaluator, 'evaluateBudgets'>,
    private readonly logger: AlertsLogger,
  ) {}

  async refresh(): Promise<void> {
    try {
      await this.evaluator.evaluateBudgets();
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'unknown';
      this.logger.error({ errorType }, 'budget alerts refresh failed');
    }
  }
}
