import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { CONNECTION_STATUSES } from './connections.repository.js';
import type { ConnectionsService, ConnectionView } from './connections.service.js';

const connectionParamsSchema = z.object({ id: z.uuid() });

const connectionsQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const archiveBodySchema = z.object({ isArchived: z.boolean() });

const connectionResponseSchema = z.object({
  id: z.uuid(),
  institutionName: z.string(),
  institutionLogoUrl: z.string().nullable(),
  status: z.enum(CONNECTION_STATUSES),
  statusDetail: z.string().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  isConfigured: z.boolean(),
  archivedAt: z.iso.datetime().nullable(),
  accounts: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
      lastDigits: z.string().nullable(),
    }),
  ),
});

const connectionListResponseSchema = z.object({ items: z.array(connectionResponseSchema) });

type ConnectionResponse = z.infer<typeof connectionResponseSchema>;

// DTO explícito: o id do item do Pluggy nunca sai na resposta.
function toConnectionResponse(connection: ConnectionView): ConnectionResponse {
  return {
    id: connection.id,
    institutionName: connection.institutionName,
    institutionLogoUrl: connection.institutionLogoUrl,
    status: connection.status,
    statusDetail: connection.statusDetail,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    isConfigured: connection.isConfigured,
    archivedAt: connection.archivedAt?.toISOString() ?? null,
    accounts: connection.accounts.map((account) => ({ ...account })),
  };
}

export function connectionsRoutes(service: ConnectionsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/connections',
      {
        schema: {
          querystring: connectionsQuerySchema,
          response: { 200: connectionListResponseSchema },
        },
      },
      async (request) => {
        const connections = await service.list({ isArchived: request.query.archived });
        return { items: connections.map(toConnectionResponse) };
      },
    );

    app.patch(
      '/connections/:id',
      {
        schema: {
          params: connectionParamsSchema,
          body: archiveBodySchema,
          response: { 200: connectionResponseSchema },
        },
      },
      async (request) => {
        const { id } = request.params;
        await service.setArchived(id, request.body.isArchived);
        // Devolve a conexão com as contas e o `isConfigured`, no mesmo formato da lista.
        const [view] = (await service.list({ isArchived: request.body.isArchived })).filter(
          (connection) => connection.id === id,
        );
        if (!view) throw new Error(`Conexão ${id} sumiu logo depois de ser atualizada`);
        return toConnectionResponse(view);
      },
    );
  };
}
