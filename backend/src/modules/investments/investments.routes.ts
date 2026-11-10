import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import type { InvestmentsService } from './investments.service.js';

const investmentItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  subtype: z.string().nullable(),
  balanceCents: centsSchema,
  percent: z.number(),
  institutionName: z.string(),
});

const investmentsResponseSchema = z.object({
  totals: z.object({
    totalCents: centsSchema,
    positionsCount: z.int(),
    closedCount: z.int(),
  }),
  groups: z.array(
    z.object({
      type: z.string(),
      totalCents: centsSchema,
      percent: z.number(),
      items: z.array(investmentItemSchema),
    }),
  ),
});

export function investmentsRoutes(service: InvestmentsService): FastifyPluginAsyncZod {
  return async (app) => {
    // O schema de resposta é a lista branca do DTO: `raw` e o id do Pluggy nunca saem.
    app.get(
      '/investments',
      { schema: { response: { 200: investmentsResponseSchema } } },
      async () => service.overview(),
    );
  };
}
