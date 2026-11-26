import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { TagRecord } from './tags.repository.js';
import type { TagsService } from './tags.service.js';

const MAX_TAG_NAME_LENGTH = 40;

// Mensagens em português: vão direto para o texto de erro embaixo do campo.
const tagBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Informe o nome da etiqueta' })
    .max(MAX_TAG_NAME_LENGTH, { error: 'O nome aceita até 40 caracteres' }),
});

const tagResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  transactionCount: z.int(),
});

const tagListResponseSchema = z.object({ items: z.array(tagResponseSchema) });

const tagParamsSchema = z.object({ id: z.uuid() });

function toTagResponse(tag: TagRecord): z.infer<typeof tagResponseSchema> {
  return { id: tag.id, name: tag.name, transactionCount: tag.transactionCount };
}

export function tagsRoutes(service: TagsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/tags', { schema: { response: { 200: tagListResponseSchema } } }, async () => ({
      items: (await service.list()).map(toTagResponse),
    }));

    app.post(
      '/tags',
      { schema: { body: tagBodySchema, response: { 201: tagResponseSchema } } },
      async (request, reply) => {
        const tag = await service.create(request.body.name);
        return reply.status(201).send(toTagResponse(tag));
      },
    );

    app.patch(
      '/tags/:id',
      {
        schema: {
          params: tagParamsSchema,
          body: tagBodySchema,
          response: { 200: tagResponseSchema },
        },
      },
      async (request) => toTagResponse(await service.rename(request.params.id, request.body.name)),
    );

    app.delete('/tags/:id', { schema: { params: tagParamsSchema } }, async (request, reply) => {
      await service.remove(request.params.id);
      return reply.status(204).send();
    });
  };
}
