import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { HealthService } from './health.service.js';

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['ok', 'unavailable']),
});

export function healthRoutes(service: HealthService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/health',
      { schema: { response: { 200: healthResponseSchema, 503: healthResponseSchema } } },
      async (_request, reply) => {
        const health = await service.check();
        return reply.status(health.status === 'ok' ? 200 : 503).send(health);
      },
    );
  };
}
