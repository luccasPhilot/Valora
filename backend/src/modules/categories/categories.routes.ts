import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { CategoryRecord } from './categories.repository.js';
import type { CategoriesService } from './categories.service.js';

const MAX_NAME_LENGTH = 60;
const MAX_ICON_LENGTH = 50;
// Nome de ícone Lucide em kebab-case ("shopping-cart"). A tela só desenha os que conhece.
const ICON_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const categoryBodySchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  kind: z.enum(['expense', 'income', 'transfer']),
  icon: z.string().max(MAX_ICON_LENGTH).regex(ICON_NAME_PATTERN),
});

const categoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: z.enum(['expense', 'income', 'transfer']),
  icon: z.string(),
  isArchived: z.boolean(),
});

const categoryListResponseSchema = z.object({ items: z.array(categoryResponseSchema) });

const categoryParamsSchema = z.object({ id: z.uuid() });

const categoryListQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

function toCategoryResponse(category: CategoryRecord): z.infer<typeof categoryResponseSchema> {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    icon: category.icon,
    isArchived: category.isArchived,
  };
}

export function categoriesRoutes(service: CategoriesService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/categories',
      {
        schema: {
          querystring: categoryListQuerySchema,
          response: { 200: categoryListResponseSchema },
        },
      },
      async (request) => {
        const categories = await service.list({
          includeArchived: request.query.includeArchived,
        });
        return { items: categories.map(toCategoryResponse) };
      },
    );

    app.post(
      '/categories',
      { schema: { body: categoryBodySchema, response: { 201: categoryResponseSchema } } },
      async (request, reply) => {
        const category = await service.create(request.body);
        return reply.status(201).send(toCategoryResponse(category));
      },
    );

    app.put(
      '/categories/:id',
      {
        schema: {
          params: categoryParamsSchema,
          body: categoryBodySchema,
          response: { 200: categoryResponseSchema },
        },
      },
      async (request) => toCategoryResponse(await service.update(request.params.id, request.body)),
    );

    app.post(
      '/categories/:id/archive',
      { schema: { params: categoryParamsSchema, response: { 200: categoryResponseSchema } } },
      async (request) => toCategoryResponse(await service.archive(request.params.id)),
    );
  };
}
