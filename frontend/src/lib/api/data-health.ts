import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /data-health. O backend é o dono; este schema é a cópia do front
// (backend/src/modules/data-health/data-health.routes.ts).

const isoDateSchema = z.iso.date();

const dataHealthSchema = z.object({
  consents: z.array(
    z.object({
      connectionId: z.uuid(),
      institutionName: z.string(),
      /** Nulo quando o banco não informou o vencimento. */
      expiresAt: z.iso.datetime().nullable(),
      /** Dias de calendário até o vencimento; negativo depois de vencer. */
      daysLeft: z.int().nullable(),
    }),
  ),
  divergences: z.array(
    z.object({
      accountId: z.uuid(),
      accountName: z.string(),
      from: isoDateSchema,
      to: isoDateSchema,
      /** Variação das fotos de saldo menos a soma das transações do período. */
      differenceCents: z.int(),
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

export type DataHealth = z.infer<typeof dataHealthSchema>;
export type ConsentStatus = DataHealth['consents'][number];
export type BalanceDivergence = DataHealth['divergences'][number];
export type StaleAccount = DataHealth['staleAccounts'][number];

export function getDataHealth(): Promise<DataHealth> {
  return apiGet('/data-health', dataHealthSchema);
}
