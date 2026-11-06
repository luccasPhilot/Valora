import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthSchema } from '../../shared/month-schema.js';
import type { PlannedEntryRecord } from './planned-entries.repository.js';
import type {
  MonthOverview,
  PlannedEntriesService,
  PlannedEntryInput,
  PlannedOccurrence,
} from './planned-entries.service.js';

const MAX_DESCRIPTION_LENGTH = 120;
const MONTH_RESPONSE_LENGTH = 7;
const DAYS_IN_LONGEST_MONTH = 31;

const monthQuerySchema = z.object({ month: monthSchema.optional() });
const entryParamsSchema = z.object({ id: z.uuid() });
const occurrenceParamsSchema = z.object({ id: z.uuid(), month: monthSchema });

const entryBodySchema = z
  .object({
    description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH),
    type: z.enum(['income', 'expense']),
    amountCents: centsSchema.positive({ error: 'O valor deve ser maior que zero' }),
    categoryId: z.uuid(),
    dayOfMonth: z.int().min(1).max(DAYS_IN_LONGEST_MONTH),
    recurrence: z.enum(['none', 'monthly', 'yearly']),
    startMonth: monthSchema,
    endMonth: monthSchema.nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .refine((body) => body.endMonth === null || body.endMonth >= body.startMonth, {
    error: 'O mês de fim não pode ser antes do início',
    path: ['endMonth'],
  });

const decisionBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('realize'), transactionId: z.uuid().optional() }),
  z.object({ action: z.literal('skip') }),
]);

const monthResponseSchema = z.string();

const entryResponseSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  /** Com sinal: negativo = despesa prevista. */
  amountCents: centsSchema,
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  dayOfMonth: z.int(),
  recurrence: z.enum(['none', 'monthly', 'yearly']),
  startMonth: monthResponseSchema,
  endMonth: monthResponseSchema.nullable(),
  isActive: z.boolean(),
});

const transactionResponseSchema = z.object({
  id: z.uuid(),
  date: z.string(),
  description: z.string(),
  amountCents: centsSchema,
});

const occurrenceResponseSchema = z.object({
  plannedEntryId: z.uuid(),
  month: monthResponseSchema,
  date: z.string(),
  entry: entryResponseSchema,
  status: z.enum(['pending', 'realized', 'skipped']),
  decidedAt: z.iso.datetime().nullable(),
  transaction: transactionResponseSchema.nullable(),
  candidates: z.array(transactionResponseSchema),
});

const statusTotalsSchema = z.object({ incomeCents: centsSchema, expenseCents: centsSchema });

const overviewResponseSchema = z.object({
  month: monthResponseSchema,
  items: z.array(occurrenceResponseSchema),
  totals: z.object({
    pending: statusTotalsSchema,
    realized: statusTotalsSchema,
    skipped: statusTotalsSchema,
  }),
  pausedEntries: z.array(entryResponseSchema),
});

type EntryBody = z.infer<typeof entryBodySchema>;

function toInput(body: EntryBody): PlannedEntryInput {
  return { ...body };
}

// DTO explícito, como nas outras rotas: a API só fala `AAAA-MM`; o dia 1 é detalhe do banco.
function toEntryResponse(entry: PlannedEntryRecord): z.infer<typeof entryResponseSchema> {
  return {
    id: entry.id,
    description: entry.description,
    amountCents: entry.amountCents,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    categoryIcon: entry.categoryIcon,
    dayOfMonth: entry.dayOfMonth,
    recurrence: entry.recurrence,
    startMonth: entry.startMonth.slice(0, MONTH_RESPONSE_LENGTH),
    endMonth: entry.endMonth?.slice(0, MONTH_RESPONSE_LENGTH) ?? null,
    isActive: entry.isActive,
  };
}

function toOccurrenceResponse(
  occurrence: PlannedOccurrence,
): z.infer<typeof occurrenceResponseSchema> {
  return {
    plannedEntryId: occurrence.plannedEntryId,
    month: occurrence.month.slice(0, MONTH_RESPONSE_LENGTH),
    date: occurrence.date,
    entry: toEntryResponse(occurrence.entry),
    status: occurrence.status,
    decidedAt: occurrence.decidedAt?.toISOString() ?? null,
    transaction: occurrence.transaction,
    candidates: [...occurrence.candidates],
  };
}

function toOverviewResponse(overview: MonthOverview): z.infer<typeof overviewResponseSchema> {
  return {
    month: overview.month.slice(0, MONTH_RESPONSE_LENGTH),
    items: overview.occurrences.map(toOccurrenceResponse),
    totals: { ...overview.totals },
    pausedEntries: overview.pausedEntries.map(toEntryResponse),
  };
}

export function plannedEntriesRoutes(service: PlannedEntriesService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/planned-entries',
      { schema: { querystring: monthQuerySchema, response: { 200: overviewResponseSchema } } },
      async (request) => toOverviewResponse(await service.overview(request.query.month)),
    );

    app.post(
      '/planned-entries',
      { schema: { body: entryBodySchema, response: { 201: entryResponseSchema } } },
      async (request, reply) => {
        const entry = await service.create(toInput(request.body));
        return reply.status(201).send(toEntryResponse(entry));
      },
    );

    app.put(
      '/planned-entries/:id',
      {
        schema: {
          params: entryParamsSchema,
          body: entryBodySchema,
          response: { 200: entryResponseSchema },
        },
      },
      async (request) =>
        toEntryResponse(await service.update(request.params.id, toInput(request.body))),
    );

    app.delete(
      '/planned-entries/:id',
      { schema: { params: entryParamsSchema } },
      async (request, reply) => {
        await service.remove(request.params.id);
        return reply.status(204).send();
      },
    );

    app.put(
      '/planned-entries/:id/occurrences/:month',
      {
        schema: {
          params: occurrenceParamsSchema,
          body: decisionBodySchema,
          response: { 200: occurrenceResponseSchema },
        },
      },
      async (request) =>
        toOccurrenceResponse(
          await service.decide(request.params.id, request.params.month, request.body),
        ),
    );

    app.delete(
      '/planned-entries/:id/occurrences/:month',
      { schema: { params: occurrenceParamsSchema } },
      async (request, reply) => {
        await service.undo(request.params.id, request.params.month);
        return reply.status(204).send();
      },
    );
  };
}
