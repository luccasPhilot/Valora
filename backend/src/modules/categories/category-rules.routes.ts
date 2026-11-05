import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { CategoryRuleRecord } from './category-rules.repository.js';
import type { CategoryRulesService } from './category-rules.service.js';

const MAX_PATTERN_LENGTH = 120;
const MIN_PRIORITY = 0;
const MAX_PRIORITY = 1000;

const matchTypeSchema = z.enum(['contains', 'starts_with', 'equals']);

const ruleBodySchema = z.object({
  pattern: z.string().trim().min(1).max(MAX_PATTERN_LENGTH),
  matchType: matchTypeSchema,
  categoryId: z.uuid(),
  priority: z.int().min(MIN_PRIORITY).max(MAX_PRIORITY).default(0),
});

const ruleResponseSchema = z.object({
  id: z.uuid(),
  pattern: z.string(),
  matchType: matchTypeSchema,
  categoryId: z.uuid(),
  priority: z.int(),
  learnedFromTransactionId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

const ruleListResponseSchema = z.object({ items: z.array(ruleResponseSchema) });

const ruleParamsSchema = z.object({ id: z.uuid() });

function toRuleResponse(rule: CategoryRuleRecord): z.infer<typeof ruleResponseSchema> {
  return {
    id: rule.id,
    pattern: rule.pattern,
    matchType: rule.matchType,
    categoryId: rule.categoryId,
    priority: rule.priority,
    learnedFromTransactionId: rule.learnedFromTransactionId,
    createdAt: rule.createdAt.toISOString(),
  };
}

export function categoryRulesRoutes(service: CategoryRulesService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/category-rules',
      { schema: { response: { 200: ruleListResponseSchema } } },
      async () => {
        const rules = await service.list();
        return { items: rules.map(toRuleResponse) };
      },
    );

    app.post(
      '/category-rules',
      { schema: { body: ruleBodySchema, response: { 201: ruleResponseSchema } } },
      async (request, reply) => {
        const rule = await service.create(request.body);
        return reply.status(201).send(toRuleResponse(rule));
      },
    );

    app.put(
      '/category-rules/:id',
      {
        schema: {
          params: ruleParamsSchema,
          body: ruleBodySchema,
          response: { 200: ruleResponseSchema },
        },
      },
      async (request) => toRuleResponse(await service.update(request.params.id, request.body)),
    );

    app.delete(
      '/category-rules/:id',
      { schema: { params: ruleParamsSchema } },
      async (request, reply) => {
        await service.delete(request.params.id);
        return reply.status(204).send();
      },
    );
  };
}
