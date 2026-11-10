import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { alertTarget } from './alert-target.js';
import type { AlertRecord } from './alerts.repository.js';
import type { AlertsService } from './alerts.service.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const alertParamsSchema = z.object({ id: z.uuid() });

const alertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const targetSchema = z.discriminatedUnion('screen', [
  z.object({
    screen: z.literal('budgets'),
    month: z.string(),
    categoryId: z.uuid(),
  }),
  z.object({ screen: z.literal('accounts') }),
  z.object({
    screen: z.literal('transactions'),
    from: z.string(),
    to: z.string(),
    search: z.string(),
  }),
]);

const alertResponseSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  message: z.string(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
  target: targetSchema.nullable(),
});

const alertListResponseSchema = z.object({
  items: z.array(alertResponseSchema),
  unreadCount: z.int(),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

// DTO explícito: nada de colunas internas (chave de deduplicação, ids de referência) sai da API.
function toAlertResponse(alert: AlertRecord): z.infer<typeof alertResponseSchema> {
  return {
    id: alert.id,
    type: alert.type,
    message: alert.message,
    createdAt: alert.createdAt.toISOString(),
    readAt: alert.readAt?.toISOString() ?? null,
    target: alertTarget(alert),
  };
}

export function alertsRoutes(service: AlertsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/alerts',
      { schema: { querystring: alertsQuerySchema, response: { 200: alertListResponseSchema } } },
      async (request) => {
        const { page, limit } = request.query;
        const result = await service.list({ page, limit });
        return {
          items: result.items.map(toAlertResponse),
          unreadCount: result.unreadCount,
          pagination: { page, limit, total: result.total },
        };
      },
    );

    app.post(
      '/alerts/:id/read',
      { schema: { params: alertParamsSchema } },
      async (request, reply) => {
        await service.markRead(request.params.id);
        return reply.status(204).send();
      },
    );

    app.post('/alerts/read-all', async (_request, reply) => {
      await service.markAllRead();
      return reply.status(204).send();
    });

    app.post(
      '/alerts/:id/dismiss',
      { schema: { params: alertParamsSchema } },
      async (request, reply) => {
        await service.dismiss(request.params.id);
        return reply.status(204).send();
      },
    );
  };
}
