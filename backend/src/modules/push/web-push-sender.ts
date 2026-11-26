import webpush from 'web-push';

import type { VapidConfig } from '../../shared/config.js';
import type {
  PushPayload,
  PushSender,
  PushSendResult,
  PushSubscriptionRecord,
} from './push-sender.js';

const ONE_DAY_SECONDS = 24 * 60 * 60;
const SEND_TIMEOUT_MS = 5000;
const GONE_STATUS_CODES: readonly number[] = [404, 410];

/** Cifra (RFC 8291) e assina (VAPID) com a biblioteca `web-push`. */
export class WebPushSender implements PushSender {
  constructor(private readonly vapid: VapidConfig) {}

  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<PushSendResult> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: this.vapid.subject,
            publicKey: this.vapid.publicKey,
            privateKey: this.vapid.privateKey,
          },
          TTL: ONE_DAY_SECONDS,
          timeout: SEND_TIMEOUT_MS,
        },
      );
      return 'sent';
    } catch (error) {
      const isGone =
        error instanceof webpush.WebPushError && GONE_STATUS_CODES.includes(error.statusCode);
      return isGone ? 'gone' : 'failed';
    }
  }
}
