import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { iconNameSchema } from '../../shared/icon-schema.js';
import { centsSchema } from '../../shared/money.js';
import type { ContributionRecord, LinkedItemRecord } from './goals.repository.js';
import type { GoalItem, GoalsService } from './goals.service.js';

const MAX_NAME_LENGTH = 80;
const MAX_LINKS = 10;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const goalParamsSchema = z.object({ id: z.uuid() });
const contributionParamsSchema = z.object({ id: z.uuid(), contributionId: z.uuid() });

const contributionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const linkTypeSchema = z.enum(['account', 'investment']);

const linksBodySchema = z
  .array(z.object({ type: linkTypeSchema, id: z.uuid() }))
  .max(MAX_LINKS, { error: `Vincule no máximo ${MAX_LINKS} itens` });

const goalBodySchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  icon: iconNameSchema,
  targetCents: centsSchema.positive({ error: 'O valor desejado deve ser maior que zero' }),
  targetDate: z.iso.date().nullable().default(null),
});

const createGoalBodySchema = goalBodySchema
  .extend({
    initialCents: centsSchema
      .nonnegative({ error: 'O valor inicial não pode ser negativo' })
      .default(0),
    links: linksBodySchema.default([]),
  })
  .refine(({ links, initialCents }) => links.length === 0 || initialCents === 0, {
    path: ['initialCents'],
    error: 'Uma meta vinculada não tem valor inicial: o valor vem do saldo dos itens',
  });

// `links` ausente mantém os vínculos; `[]` desvincula.
const updateGoalBodySchema = goalBodySchema.extend({ links: linksBodySchema.optional() });

const contributionBodySchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amountCents: centsSchema.positive({ error: 'O valor deve ser maior que zero' }),
  date: z.iso.date({ error: 'Informe uma data válida' }),
});

const contributionResponseSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  /** Com sinal: negativo = retirada. */
  amountCents: centsSchema,
  kind: z.enum(['initial', 'deposit', 'withdrawal']),
});

const linkResponseSchema = z.object({
  type: linkTypeSchema,
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  balanceCents: centsSchema,
  isArchived: z.boolean(),
});

const goalResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  icon: z.string(),
  targetCents: centsSchema,
  savedCents: centsSchema,
  /** A soma dos aportes guardada na meta; só vale de fato enquanto ela não é vinculada. */
  manualSavedCents: centsSchema,
  isLinked: z.boolean(),
  links: z.array(linkResponseSchema),
  targetDate: z.iso.date().nullable(),
  progressPercent: z.int(),
  status: z.enum(['completed', 'no_pace', 'on_track', 'behind']),
  remainingCents: centsSchema,
  monthlyRateCents: centsSchema,
  requiredMonthlyCents: centsSchema.nullable(),
  estimatedDate: z.iso.date().nullable(),
  isEstimateTooFar: z.boolean(),
  recentContributions: z.array(contributionResponseSchema),
});

const goalListResponseSchema = z.object({ items: z.array(goalResponseSchema) });

const contributionListResponseSchema = z.object({
  items: z.array(contributionResponseSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

// DTO explícito: nada de colunas internas (nem as da v3) sai da API.
function toContributionResponse(
  contribution: ContributionRecord,
): z.infer<typeof contributionResponseSchema> {
  return {
    id: contribution.id,
    date: contribution.date,
    amountCents: contribution.amountCents,
    kind: contribution.kind,
  };
}

function toLinkResponse(link: LinkedItemRecord): z.infer<typeof linkResponseSchema> {
  return {
    type: link.type,
    id: link.id,
    name: link.name,
    institutionName: link.institutionName,
    balanceCents: link.balanceCents,
    isArchived: link.isArchived,
  };
}

function toGoalResponse(goal: GoalItem): z.infer<typeof goalResponseSchema> {
  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    targetCents: goal.targetCents,
    savedCents: goal.savedCents,
    manualSavedCents: goal.manualSavedCents,
    isLinked: goal.isLinked,
    links: goal.links.map(toLinkResponse),
    targetDate: goal.targetDate,
    progressPercent: goal.progressPercent,
    status: goal.status,
    remainingCents: goal.remainingCents,
    monthlyRateCents: goal.monthlyRateCents,
    requiredMonthlyCents: goal.requiredMonthlyCents,
    estimatedDate: goal.estimatedDate,
    isEstimateTooFar: goal.isEstimateTooFar,
    recentContributions: goal.recentContributions.map(toContributionResponse),
  };
}

export function goalsRoutes(service: GoalsService): FastifyPluginAsyncZod {
  return async (app) => {
    // Sem paginação de propósito: são poucas dezenas de metas (docs/03-arquitetura.md, Decisões).
    app.get('/goals', { schema: { response: { 200: goalListResponseSchema } } }, async () => ({
      items: (await service.list()).map(toGoalResponse),
    }));

    app.post(
      '/goals',
      { schema: { body: createGoalBodySchema, response: { 201: goalResponseSchema } } },
      async (request, reply) =>
        reply.status(201).send(toGoalResponse(await service.create(request.body))),
    );

    app.put(
      '/goals/:id',
      {
        schema: {
          params: goalParamsSchema,
          body: updateGoalBodySchema,
          response: { 200: goalResponseSchema },
        },
      },
      async (request) => toGoalResponse(await service.update(request.params.id, request.body)),
    );

    app.delete('/goals/:id', { schema: { params: goalParamsSchema } }, async (request, reply) => {
      await service.remove(request.params.id);
      return reply.status(204).send();
    });

    app.get(
      '/goals/:id/contributions',
      {
        schema: {
          params: goalParamsSchema,
          querystring: contributionsQuerySchema,
          response: { 200: contributionListResponseSchema },
        },
      },
      async (request) => {
        const { page, limit } = request.query;
        const result = await service.listContributions(request.params.id, { page, limit });
        return {
          items: result.items.map(toContributionResponse),
          pagination: { page, limit, total: result.total },
        };
      },
    );

    app.post(
      '/goals/:id/contributions',
      {
        schema: {
          params: goalParamsSchema,
          body: contributionBodySchema,
          response: { 201: goalResponseSchema },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(toGoalResponse(await service.addContribution(request.params.id, request.body))),
    );

    app.delete(
      '/goals/:id/contributions/:contributionId',
      { schema: { params: contributionParamsSchema, response: { 200: goalResponseSchema } } },
      async (request) =>
        toGoalResponse(
          await service.removeContribution(request.params.id, request.params.contributionId),
        ),
    );
  };
}
