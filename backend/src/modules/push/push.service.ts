import { PushDisabledError } from './push.errors.js';
import type {
  PushPayload,
  PushSender,
  PushSendResult,
  PushSubscriptionRecord,
} from './push-sender.js';
import type { PushSubscriptionsRepository } from './push-subscriptions.repository.js';

export interface PushLogger {
  warn(details: Record<string, unknown>, message: string): void;
}

export interface PushServiceDependencies {
  readonly subscriptions: PushSubscriptionsRepository;
  /** `null` com o push desligado (sem chaves VAPID no `.env`). */
  readonly sender: PushSender | null;
  readonly publicKey: string | null;
  readonly logger: PushLogger;
}

interface DeliveryResult {
  readonly endpoint: string;
  readonly result: PushSendResult;
}

const DISABLED_MESSAGE = 'O push está desligado: faltam as chaves VAPID no .env';

const TEST_PAYLOAD: PushPayload = {
  title: 'Valora',
  body: 'Notificações do Valora ativadas',
  url: '/',
};

export class PushService {
  constructor(private readonly deps: PushServiceDependencies) {}

  get isEnabled(): boolean {
    return this.deps.sender !== null && this.deps.publicKey !== null;
  }

  getPublicKey(): string {
    if (!this.deps.publicKey) throw new PushDisabledError(DISABLED_MESSAGE);
    return this.deps.publicKey;
  }

  async subscribe(subscription: PushSubscriptionRecord): Promise<void> {
    this.assertEnabled();
    await this.deps.subscriptions.upsert(subscription);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    this.assertEnabled();
    await this.deps.subscriptions.deleteByEndpoint(endpoint);
  }

  async sendTest(): Promise<void> {
    this.assertEnabled();
    await this.broadcast(TEST_PAYLOAD);
  }

  /**
   * Manda para todas as inscrições, em paralelo. Apaga as que o serviço de push diz que não existem
   * mais. O log leva só contagens: nunca o endereço de uma inscrição.
   */
  async broadcast(payload: PushPayload): Promise<void> {
    const { sender } = this.deps;
    if (!sender) return;
    const subscriptions = await this.deps.subscriptions.findAll();
    const deliveries = await Promise.all(
      subscriptions.map(async (subscription) => ({
        endpoint: subscription.endpoint,
        result: await sendSafely(sender, subscription, payload),
      })),
    );
    await this.recordDeliveries(deliveries);
  }

  private async recordDeliveries(deliveries: readonly DeliveryResult[]): Promise<void> {
    const endpointsWith = (wanted: PushSendResult) =>
      deliveries.filter(({ result }) => result === wanted).map(({ endpoint }) => endpoint);
    const goneEndpoints = endpointsWith('gone');
    await Promise.all([
      this.deps.subscriptions.markSucceeded(endpointsWith('sent')),
      ...goneEndpoints.map((endpoint) => this.deps.subscriptions.deleteByEndpoint(endpoint)),
    ]);
    const failedCount = endpointsWith('failed').length;
    if (failedCount === 0 && goneEndpoints.length === 0) return;
    this.deps.logger.warn(
      { failedCount, removedCount: goneEndpoints.length },
      'push delivery problems',
    );
  }

  private assertEnabled(): void {
    if (!this.isEnabled) throw new PushDisabledError(DISABLED_MESSAGE);
  }
}

async function sendSafely(
  sender: PushSender,
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<PushSendResult> {
  try {
    return await sender.send(subscription, payload);
  } catch {
    return 'failed';
  }
}
