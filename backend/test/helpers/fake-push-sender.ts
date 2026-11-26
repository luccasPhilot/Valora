import type {
  PushPayload,
  PushSender,
  PushSendResult,
  PushSubscriptionRecord,
} from '../../src/modules/push/push-sender.js';
import type { VapidConfig } from '../../src/shared/config.js';

/** Chaves só para os testes: o envio é sempre o falso, nenhum serviço de push é chamado. */
export const TEST_VAPID: VapidConfig = {
  publicKey: 'chave-publica-de-teste',
  privateKey: 'chave-privada-de-teste',
  subject: 'https://valora.exemplo.ts.net',
};

export interface SentPush {
  readonly endpoint: string;
  readonly payload: PushPayload;
}

/** Guarda o que seria enviado; `resultFor` simula 410 (`gone`) ou falha por aparelho. */
export class FakePushSender implements PushSender {
  readonly sent: SentPush[] = [];

  constructor(
    private readonly resultFor: (endpoint: string) => PushSendResult | 'throw' = () => 'sent',
  ) {}

  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<PushSendResult> {
    this.sent.push({ endpoint: subscription.endpoint, payload });
    const result = this.resultFor(subscription.endpoint);
    if (result === 'throw') throw new TypeError('falha simulada do envio');
    return result;
  }

  bodies(): string[] {
    return this.sent.map(({ payload }) => payload.body);
  }
}
