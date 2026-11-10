import { z } from 'zod';

import { apiGet, apiPostNoContent } from '../api-client';

// Contrato de /alerts. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/alerts/alerts.routes.ts).

/** Os alertas ativos que o sino mostra de uma vez: o backend limita a página a 50. */
export const ALERTS_PAGE_SIZE = 50;

// Um destino que o front ainda não conhece vira `null` (alerta sem ação), nunca quebra a lista.
const targetSchema = z
  .discriminatedUnion('screen', [
    z.object({ screen: z.literal('budgets'), month: z.string(), categoryId: z.uuid() }),
    z.object({ screen: z.literal('accounts') }),
    z.object({
      screen: z.literal('transactions'),
      from: z.string(),
      to: z.string(),
      search: z.string(),
    }),
  ])
  .nullable()
  .catch(null);

export const alertSchema = z.object({
  id: z.uuid(),
  // Texto livre de propósito: um tipo novo do backend aparece como alerta genérico, não como erro.
  type: z.string(),
  message: z.string(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
  target: targetSchema,
});

const alertListSchema = z.object({
  items: z.array(alertSchema),
  unreadCount: z.int(),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

export type Alert = z.infer<typeof alertSchema>;
export type AlertTarget = NonNullable<Alert['target']>;
export type AlertList = z.infer<typeof alertListSchema>;

export function getAlerts(): Promise<AlertList> {
  return apiGet(`/alerts?limit=${ALERTS_PAGE_SIZE}`, alertListSchema);
}

export function markAlertRead(alertId: string): Promise<void> {
  return apiPostNoContent(`/alerts/${alertId}/read`);
}

export function markAllAlertsRead(): Promise<void> {
  return apiPostNoContent('/alerts/read-all');
}

export function dismissAlert(alertId: string): Promise<void> {
  return apiPostNoContent(`/alerts/${alertId}/dismiss`);
}
