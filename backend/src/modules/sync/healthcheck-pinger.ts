import type { SyncLogger } from './sync.service.js';

/** Tempo máximo da chamada: o aviso nunca segura a sincronização. */
export const PING_TIMEOUT_MS = 5_000;
const FAIL_SUFFIX = '/fail';

export type HeartbeatResult = 'success' | 'fail';

export interface HealthcheckPingerOptions {
  /** URL de ping do healthchecks.io; `null` desliga o aviso. É segredo: nunca vai para o log. */
  readonly url: string | null;
  readonly fetch: typeof globalThis.fetch;
  readonly logger: Pick<SyncLogger, 'warn'>;
  readonly timeoutMs?: number;
}

function errorTypeOf(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/**
 * Único ponto do backend que fala com o healthchecks.io. Manda só o sinal de ok ou de falha, sem
 * corpo e sem nenhum dado do banco, e nunca rejeita: um aviso que não sai vira só uma linha no log.
 */
export class HealthcheckPinger {
  private readonly timeoutMs: number;

  constructor(private readonly options: HealthcheckPingerOptions) {
    this.timeoutMs = options.timeoutMs ?? PING_TIMEOUT_MS;
  }

  async report(result: HeartbeatResult): Promise<void> {
    const { url, fetch, logger } = this.options;
    if (url === null) return;
    const target = result === 'success' ? url : `${url}${FAIL_SUFFIX}`;
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(this.timeoutMs) });
      if (!response.ok) logger.warn({ statusCode: response.status }, 'healthcheck ping rejected');
    } catch (error) {
      logger.warn({ errorType: errorTypeOf(error) }, 'healthcheck ping failed');
    }
  }
}
