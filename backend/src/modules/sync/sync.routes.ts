import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, SyncInProgressError } from '../../shared/errors.js';
import type { SyncService } from './sync.service.js';
import type { SyncRunRecord } from './sync-runs.repository.js';

const syncRunResponseSchema = z.object({
  id: z.uuid(),
  trigger: z.enum(['schedule', 'manual']),
  status: z.enum(['running', 'success', 'partial', 'failed']),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  stats: z
    .object({
      accounts: z.int(),
      transactionsInserted: z.int(),
      transactionsUpdated: z.int(),
      transactionsRemoved: z.int(),
      investments: z.int(),
    })
    .nullable(),
  errorMessage: z.string().nullable(),
});

type SyncRunResponse = z.infer<typeof syncRunResponseSchema>;

function toSyncRunResponse(run: SyncRunRecord): SyncRunResponse {
  return {
    id: run.id,
    trigger: run.trigger,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    stats: run.stats,
    errorMessage: run.errorMessage,
  };
}

export function syncRoutes(service: SyncService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/sync-runs',
      { schema: { response: { 202: syncRunResponseSchema } } },
      async (_request, reply) => {
        const started = await service.start('manual');
        if (started.status === 'already_running') {
          throw new SyncInProgressError('Já existe uma sincronização em andamento');
        }
        return reply.status(202).send(toSyncRunResponse(started.run));
      },
    );

    app.get(
      '/sync-runs/latest',
      { schema: { response: { 200: syncRunResponseSchema } } },
      async () => {
        const latestRun = await service.findLatestRun();
        if (!latestRun) throw new NotFoundError('Nenhuma sincronização foi feita ainda');
        return toSyncRunResponse(latestRun);
      },
    );
  };
}
