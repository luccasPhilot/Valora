import { z } from 'zod';

import { apiDelete, ApiError, apiGet, apiPostNoContent } from '../api-client';

// Contrato de /push. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/push/push.routes.ts).

const PUSH_DISABLED_CODE = 'PUSH_DISABLED';
const NOT_FOUND_STATUS = 404;

const publicKeyResponseSchema = z.object({ publicKey: z.string().min(1) });

/** A inscrição como o navegador a entrega em `PushSubscription.toJSON()`. */
export const pushSubscriptionJsonSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export type PushSubscriptionJson = z.infer<typeof pushSubscriptionJsonSchema>;

/** A chave pública do servidor, ou `null` quando o push está desligado (sem chaves no `.env`). */
export async function fetchPushPublicKey(): Promise<string | null> {
  try {
    const { publicKey } = await apiGet('/push/public-key', publicKeyResponseSchema);
    return publicKey;
  } catch (error) {
    const isPushDisabled =
      error instanceof ApiError &&
      error.status === NOT_FOUND_STATUS &&
      error.code === PUSH_DISABLED_CODE;
    if (isPushDisabled) return null;
    throw error;
  }
}

export function registerPushSubscription(subscription: PushSubscriptionJson): Promise<void> {
  return apiPostNoContent('/push/subscriptions', subscription);
}

export function removePushSubscription(endpoint: string): Promise<void> {
  return apiDelete('/push/subscriptions', { endpoint });
}

export function sendPushTest(): Promise<void> {
  return apiPostNoContent('/push/test');
}
