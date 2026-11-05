import { z } from 'zod';

import { apiGet, apiPatch } from '../api-client';

// Contrato de /accounts. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/accounts/accounts.routes.ts).

const connectionStatusSchema = z.enum(['ok', 'syncing', 'error', 'consent_expired']);

const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  lastDigits: z.string().nullable(),
  /** Nulo em "Dinheiro". No cartão, é a fatura atual. */
  balanceCents: z.int().nullable(),
  creditLimitCents: z.int().nullable(),
  availableLimitCents: z.int().nullable(),
  isHidden: z.boolean(),
  /** Nulo em "Dinheiro", que não pertence a nenhum banco. */
  connection: z
    .object({
      id: z.uuid(),
      institutionName: z.string(),
      status: connectionStatusSchema,
      statusDetail: z.string().nullable(),
      lastSyncedAt: z.iso.datetime().nullable(),
    })
    .nullable(),
});

const accountsOverviewSchema = z.object({
  items: z.array(accountSchema),
  totals: z.object({
    totalBalanceCents: z.int(),
    openCreditCardBillsCents: z.int(),
    availableCreditCents: z.int(),
  }),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountType = Account['type'];
export type AccountConnection = NonNullable<Account['connection']>;
export type ConnectionStatus = AccountConnection['status'];
export type AccountsOverview = z.infer<typeof accountsOverviewSchema>;

// Sem paginação: são poucas contas (no máximo 5 bancos).
export function getAccountsOverview(): Promise<AccountsOverview> {
  return apiGet('/accounts', accountsOverviewSchema);
}

export function setAccountHidden(accountId: string, isHidden: boolean): Promise<Account> {
  return apiPatch(`/accounts/${accountId}`, { isHidden }, accountSchema);
}
