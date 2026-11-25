import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import type { DataHealthReport, DataHealthService } from './data-health.service.js';

const isoDateSchema = z.iso.date();

const dataHealthResponseSchema = z.object({
  consents: z.array(
    z.object({
      connectionId: z.uuid(),
      institutionName: z.string(),
      expiresAt: z.iso.datetime().nullable(),
      daysLeft: z.int().nullable(),
    }),
  ),
  divergences: z.array(
    z.object({
      accountId: z.uuid(),
      accountName: z.string(),
      from: isoDateSchema,
      to: isoDateSchema,
      differenceCents: centsSchema,
    }),
  ),
  staleAccounts: z.array(
    z.object({
      accountId: z.uuid(),
      accountName: z.string(),
      lastTransactionDate: isoDateSchema.nullable(),
      daysWithoutTransactions: z.int(),
    }),
  ),
});

type DataHealthResponse = z.infer<typeof dataHealthResponseSchema>;

// DTO explícito: só os campos que a tela usa.
function toDataHealthResponse(report: DataHealthReport): DataHealthResponse {
  return {
    consents: report.consents.map((consent) => ({
      connectionId: consent.connectionId,
      institutionName: consent.institutionName,
      expiresAt: consent.expiresAt?.toISOString() ?? null,
      daysLeft: consent.daysLeft,
    })),
    divergences: report.divergences.map((divergence) => ({
      accountId: divergence.accountId,
      accountName: divergence.accountName,
      from: divergence.from,
      to: divergence.to,
      differenceCents: divergence.differenceCents,
    })),
    staleAccounts: report.staleAccounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      lastTransactionDate: account.lastTransactionDate,
      daysWithoutTransactions: account.daysWithoutTransactions,
    })),
  };
}

export function dataHealthRoutes(service: DataHealthService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/data-health', { schema: { response: { 200: dataHealthResponseSchema } } }, async () =>
      toDataHealthResponse(await service.getReport()),
    );
  };
}
