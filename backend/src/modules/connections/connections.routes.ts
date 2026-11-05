import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { ConnectionRecord } from './connections.repository.js';
import type { ConnectionsService } from './connections.service.js';

const connectionResponseSchema = z.object({
  id: z.uuid(),
  institutionName: z.string(),
  institutionLogoUrl: z.string().nullable(),
  status: z.enum(['ok', 'syncing', 'error', 'consent_expired']),
  statusDetail: z.string().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
});

const connectionListResponseSchema = z.object({ items: z.array(connectionResponseSchema) });

function toConnectionResponse(
  connection: ConnectionRecord,
): z.infer<typeof connectionResponseSchema> {
  return {
    id: connection.id,
    institutionName: connection.institutionName,
    institutionLogoUrl: connection.institutionLogoUrl,
    status: connection.status,
    statusDetail: connection.statusDetail,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  };
}

export function connectionsRoutes(service: ConnectionsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/connections',
      { schema: { response: { 200: connectionListResponseSchema } } },
      async () => {
        const connections = await service.list();
        return { items: connections.map(toConnectionResponse) };
      },
    );
  };
}
