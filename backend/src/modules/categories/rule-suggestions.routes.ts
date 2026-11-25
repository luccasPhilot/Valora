import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { MAX_RULE_PATTERN_LENGTH, type RuleSuggestion } from './rule-suggestions.js';
import type { RuleSuggestionsService } from './rule-suggestions.service.js';

export const ruleSuggestionResponseSchema = z.object({
  pattern: z.string(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  correctionCount: z.int(),
});

const suggestionListResponseSchema = z.object({ items: z.array(ruleSuggestionResponseSchema) });

const dismissBodySchema = z.object({
  pattern: z.string().trim().min(1).max(MAX_RULE_PATTERN_LENGTH),
  categoryId: z.uuid(),
});

export function toRuleSuggestionResponse(
  suggestion: RuleSuggestion,
): z.infer<typeof ruleSuggestionResponseSchema> {
  return {
    pattern: suggestion.pattern,
    categoryId: suggestion.categoryId,
    categoryName: suggestion.categoryName,
    categoryIcon: suggestion.categoryIcon,
    correctionCount: suggestion.correctionCount,
  };
}

export function ruleSuggestionsRoutes(service: RuleSuggestionsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/category-rules/suggestions',
      { schema: { response: { 200: suggestionListResponseSchema } } },
      async () => {
        const suggestions = await service.list();
        return { items: suggestions.map(toRuleSuggestionResponse) };
      },
    );

    app.post(
      '/category-rules/suggestions/dismiss',
      { schema: { body: dismissBodySchema } },
      async (request, reply) => {
        await service.dismiss(request.body);
        return reply.status(204).send();
      },
    );
  };
}
