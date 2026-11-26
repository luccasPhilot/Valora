import type { Database } from '../../db/database.js';
import type { Config } from '../../shared/config.js';
import { TransactionReviewRepository } from '../transactions/transaction-review.repository.js';
import { type PushLogger, PushService } from './push.service.js';
import { PushNotifier, type PushNotifierLogger } from './push-notifier.js';
import type { PushSender } from './push-sender.js';
import { PushSubscriptionsRepository } from './push-subscriptions.repository.js';
import { WebPushSender } from './web-push-sender.js';

export interface PushModuleDependencies {
  readonly config: Pick<Config, 'vapid'>;
  readonly database: Database;
  readonly logger: PushLogger & PushNotifierLogger;
  readonly now: () => Date;
  /** Os testes passam um falso; em produção, o `web-push` com as chaves VAPID. */
  readonly sender?: PushSender;
}

export interface PushModule {
  readonly pushService: PushService;
  readonly pushNotifier: PushNotifier;
}

export function createPushModule(deps: PushModuleDependencies): PushModule {
  const { vapid } = deps.config;
  const sender = vapid ? (deps.sender ?? new WebPushSender(vapid)) : null;
  const pushService = new PushService({
    subscriptions: new PushSubscriptionsRepository(deps.database.db),
    sender,
    publicKey: vapid?.publicKey ?? null,
    logger: deps.logger,
  });
  const pushNotifier = new PushNotifier({
    push: pushService,
    reviews: new TransactionReviewRepository(deps.database.db),
    logger: deps.logger,
    now: deps.now,
  });
  return { pushService, pushNotifier };
}
