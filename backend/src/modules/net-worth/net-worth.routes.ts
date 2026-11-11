import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthRangeQuerySchema } from '../../shared/month-range.js';
import type { NetWorthService } from './net-worth.service.js';

const partsSchema = {
  accountsCents: centsSchema,
  investmentsCents: centsSchema,
  openBillsCents: centsSchema,
  netWorthCents: centsSchema,
};

const netWorthResponseSchema = z.object({
  current: z.object({ date: z.iso.date(), ...partsSchema }),
  points: z.array(z.object({ month: z.string(), date: z.iso.date(), ...partsSchema })),
  monthChange: z.object({ cents: centsSchema, percent: z.number().nullable() }).nullable(),
  firstSnapshotDate: z.iso.date().nullable(),
});

export function netWorthRoutes(service: NetWorthService): FastifyPluginAsyncZod {
  return async (app) => {
    // O schema de resposta é a lista branca do DTO: nada além destes campos sai.
    app.get(
      '/net-worth',
      { schema: { querystring: monthRangeQuerySchema, response: { 200: netWorthResponseSchema } } },
      async (request) => {
        const overview = await service.overview(request.query);
        return { ...overview, points: [...overview.points] };
      },
    );
  };
}
