import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import type { ProjectionResult, ProjectionService } from './projection.service.js';

const isoDateSchema = z.iso.date();

const projectionResponseSchema = z.object({
  date: isoDateSchema,
  startBalanceCents: centsSchema,
  plannedIncomeCents: centsSchema,
  plannedExpenseCents: centsSchema,
  billsDueCents: centsSchema,
  projectedBalanceCents: centsSchema,
  lowestBalanceCents: centsSchema,
  lowestBalanceDate: isoDateSchema,
  daily: z.array(z.object({ date: isoDateSchema, balanceCents: centsSchema })),
  events: z.array(
    z.object({
      type: z.enum(['planned_income', 'planned_expense', 'bill']),
      date: isoDateSchema,
      description: z.string(),
      amountCents: centsSchema,
      isOverdue: z.boolean(),
      isEstimatedDate: z.boolean(),
    }),
  ),
  warnings: z.array(z.string()),
});

function toProjectionResponse(
  projection: ProjectionResult,
): z.infer<typeof projectionResponseSchema> {
  return {
    ...projection,
    daily: projection.daily.map((day) => ({ ...day })),
    events: projection.events.map((event) => ({ ...event })),
    warnings: [...projection.warnings],
  };
}

export function projectionRoutes(service: ProjectionService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/projection', { schema: { response: { 200: projectionResponseSchema } } }, async () =>
      toProjectionResponse(await service.projection()),
    );
  };
}
