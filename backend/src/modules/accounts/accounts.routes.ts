import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AccountsService } from './accounts.service.js';

const accountResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  institutionName: z.string().nullable(),
});

const accountListResponseSchema = z.object({ items: z.array(accountResponseSchema) });

export function accountsRoutes(service: AccountsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/accounts',
      { schema: { response: { 200: accountListResponseSchema } } },
      async () => ({ items: await service.list() }),
    );
  };
}
