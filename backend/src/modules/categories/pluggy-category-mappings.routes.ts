import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { PluggyCategoryMappingsService } from './pluggy-category-mappings.service.js';

const MAX_PLUGGY_CATEGORY_LENGTH = 120;

const mappingResponseSchema = z.object({
  pluggyCategory: z.string(),
  categoryId: z.uuid().nullable(),
});

const mappingListResponseSchema = z.object({ items: z.array(mappingResponseSchema) });

const mappingParamsSchema = z.object({
  pluggyCategory: z.string().min(1).max(MAX_PLUGGY_CATEGORY_LENGTH),
});

// `categoryId: null` limpa o mapeamento.
const mappingBodySchema = z.object({ categoryId: z.uuid().nullable() });

export function pluggyCategoryMappingsRoutes(
  service: PluggyCategoryMappingsService,
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/pluggy-category-mappings',
      { schema: { response: { 200: mappingListResponseSchema } } },
      async () => ({ items: await service.list() }),
    );

    app.put(
      '/pluggy-category-mappings/:pluggyCategory',
      {
        schema: {
          params: mappingParamsSchema,
          body: mappingBodySchema,
          response: { 200: mappingResponseSchema },
        },
      },
      async (request) => service.set(request.params.pluggyCategory, request.body.categoryId),
    );
  };
}
