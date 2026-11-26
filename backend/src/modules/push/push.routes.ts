import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { PushService } from './push.service.js';

const HTTPS_PROTOCOL = /^https$/;

// Formato do `PushSubscription.toJSON()` do navegador; o resto (`expirationTime`) é descartado.
const subscriptionBodySchema = z.object({
  endpoint: z.url({ protocol: HTTPS_PROTOCOL }),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const unsubscribeBodySchema = z.object({ endpoint: z.url({ protocol: HTTPS_PROTOCOL }) });

const publicKeyResponseSchema = z.object({ publicKey: z.string() });

export function pushRoutes(service: PushService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/push/public-key',
      { schema: { response: { 200: publicKeyResponseSchema } } },
      async () => ({ publicKey: service.getPublicKey() }),
    );

    app.post(
      '/push/subscriptions',
      { schema: { body: subscriptionBodySchema } },
      async (request, reply) => {
        const { endpoint, keys } = request.body;
        await service.subscribe({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
        return reply.status(204).send();
      },
    );

    app.delete(
      '/push/subscriptions',
      { schema: { body: unsubscribeBodySchema } },
      async (request, reply) => {
        await service.unsubscribe(request.body.endpoint);
        return reply.status(204).send();
      },
    );

    app.post('/push/test', async (_request, reply) => {
      await service.sendTest();
      return reply.status(204).send();
    });
  };
}
