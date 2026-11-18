import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { investmentSourceSchema } from './investment-groups.js';
import type { ManualInvestmentRecord } from './investments.repository.js';
import type { InvestmentsService } from './investments.service.js';

const MAX_TEXT_LENGTH = 60;
const MANUAL_INVESTMENT_TYPES = [
  'FIXED_INCOME',
  'MUTUAL_FUND',
  'EQUITY',
  'ETF',
  'CRYPTO',
  'OTHER',
] as const;

const investmentParamsSchema = z.object({ id: z.uuid() });

const textSchema = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

const createInvestmentBodySchema = z.object({
  name: textSchema,
  institutionName: textSchema,
  type: z.enum(MANUAL_INVESTMENT_TYPES),
  balanceCents: centsSchema.positive({ error: 'O valor deve ser maior que zero' }),
});

// Edição parcial; o valor pode ir a zero (posição encerrada).
const updateInvestmentBodySchema = createInvestmentBodySchema
  .partial()
  .extend({
    balanceCents: centsSchema.nonnegative({ error: 'O valor não pode ser negativo' }).optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

const investmentItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  subtype: z.string().nullable(),
  balanceCents: centsSchema,
  percent: z.number(),
  institutionName: z.string(),
  source: investmentSourceSchema,
  balanceUpdatedOn: z.string().nullable(),
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

const manualInvestmentResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string(),
  type: z.string(),
  balanceCents: centsSchema,
  source: z.literal('manual'),
  balanceUpdatedOn: z.string().nullable(),
});

function toManualInvestmentResponse(
  investment: ManualInvestmentRecord,
): z.infer<typeof manualInvestmentResponseSchema> {
  return {
    id: investment.id,
    name: investment.name,
    institutionName: investment.institutionName,
    type: investment.type,
    balanceCents: investment.balanceCents,
    source: 'manual',
    balanceUpdatedOn: investment.balanceUpdatedOn,
  };
}

export function investmentsRoutes(service: InvestmentsService): FastifyPluginAsyncZod {
  return async (app) => {
    // O schema de resposta é a lista branca do DTO: `raw` e o id do Pluggy nunca saem.
    app.get(
      '/investments',
      { schema: { response: { 200: investmentsResponseSchema } } },
      async () => service.overview(),
    );

    app.post(
      '/investments',
      {
        schema: {
          body: createInvestmentBodySchema,
          response: { 201: manualInvestmentResponseSchema },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(toManualInvestmentResponse(await service.createManual(request.body))),
    );

    app.patch(
      '/investments/:id',
      {
        schema: {
          params: investmentParamsSchema,
          body: updateInvestmentBodySchema,
          response: { 200: manualInvestmentResponseSchema },
        },
      },
      async (request) =>
        toManualInvestmentResponse(await service.updateManual(request.params.id, request.body)),
    );

    app.delete(
      '/investments/:id',
      { schema: { params: investmentParamsSchema } },
      async (request, reply) => {
        await service.removeManual(request.params.id);
        return reply.status(204).send();
      },
    );
  };
}
