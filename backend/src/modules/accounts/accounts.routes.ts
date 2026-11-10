import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { CONNECTION_STATUSES } from '../connections/connections.repository.js';
import type { AccountRecord } from './accounts.repository.js';
import type { AccountsService } from './accounts.service.js';

const accountResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  lastDigits: z.string().nullable(),
  balanceCents: centsSchema.nullable(),
  creditLimitCents: centsSchema.nullable(),
  availableLimitCents: centsSchema.nullable(),
  isHidden: z.boolean(),
  connection: z
    .object({
      id: z.uuid(),
      institutionName: z.string(),
      status: z.enum(CONNECTION_STATUSES),
      statusDetail: z.string().nullable(),
      lastSyncedAt: z.iso.datetime().nullable(),
    })
    .nullable(),
});

const accountListResponseSchema = z.object({
  items: z.array(accountResponseSchema),
  totals: z.object({
    totalBalanceCents: centsSchema,
    openCreditCardBillsCents: centsSchema,
    availableCreditCents: centsSchema,
  }),
});

const accountParamsSchema = z.object({ id: z.uuid() });
const accountUpdateBodySchema = z.object({ isHidden: z.boolean() });

// DTO explícito: o `raw` do Pluggy nunca sai da API.
function toAccountResponse(account: AccountRecord): z.infer<typeof accountResponseSchema> {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    lastDigits: account.lastDigits,
    balanceCents: account.balanceCents,
    creditLimitCents: account.creditLimitCents,
    availableLimitCents: account.availableLimitCents,
    isHidden: account.isHidden,
    connection: account.connection && {
      id: account.connection.id,
      institutionName: account.connection.institutionName,
      status: account.connection.status,
      statusDetail: account.connection.statusDetail,
      lastSyncedAt: account.connection.lastSyncedAt?.toISOString() ?? null,
    },
  };
}

export function accountsRoutes(service: AccountsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/accounts', { schema: { response: { 200: accountListResponseSchema } } }, async () => {
      const { accounts, totals } = await service.overview();
      return { items: accounts.map(toAccountResponse), totals };
    });

    app.patch(
      '/accounts/:id',
      {
        schema: {
          params: accountParamsSchema,
          body: accountUpdateBodySchema,
          response: { 200: accountResponseSchema },
        },
      },
      async (request) =>
        toAccountResponse(await service.setHidden(request.params.id, request.body.isHidden)),
    );
  };
}
