import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { TRANSACTION_TYPES } from './transaction-type-filter.js';
import type { TransactionRecord } from './transactions.repository.js';
import type { TransactionsService } from './transactions.service.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

const listQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    categoryId: z.uuid().optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    accountId: z.uuid().optional(),
    search: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: 'A data inicial não pode ser depois da final',
    path: ['from'],
  });

const transactionParamsSchema = z.object({ id: z.uuid() });

const changeCategoryBodySchema = z.object({
  categoryId: z.uuid(),
  applyAlways: z.boolean().default(false),
});

const transactionResponseSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  description: z.string(),
  amountCents: z.int(),
  status: z.enum(['pending', 'posted']),
  source: z.enum(['open_finance', 'manual']),
  category: z
    .object({
      id: z.uuid(),
      name: z.string(),
      icon: z.string(),
      kind: z.enum(['expense', 'income', 'transfer']),
    })
    .nullable(),
  categorySource: z.enum(['user', 'rule', 'pluggy', 'none']),
  account: z.object({
    id: z.uuid(),
    name: z.string(),
    type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  }),
  installmentNumber: z.int().nullable(),
  installmentTotal: z.int().nullable(),
});

const transactionListResponseSchema = z.object({
  items: z.array(transactionResponseSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

// Lista os campos um a um: o JSON bruto do Pluggy nunca sai da API.
function toTransactionResponse(
  transaction: TransactionRecord,
): z.infer<typeof transactionResponseSchema> {
  return {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amountCents: transaction.amountCents,
    status: transaction.status,
    source: transaction.source,
    category: transaction.category,
    categorySource: transaction.categorySource,
    account: transaction.account,
    installmentNumber: transaction.installmentNumber,
    installmentTotal: transaction.installmentTotal,
  };
}

export function transactionsRoutes(service: TransactionsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/transactions',
      {
        schema: { querystring: listQuerySchema, response: { 200: transactionListResponseSchema } },
      },
      async (request) => {
        const { page, limit, ...filters } = request.query;
        const result = await service.list(filters, { page, limit });
        return {
          items: result.items.map(toTransactionResponse),
          pagination: { page, limit, total: result.total },
        };
      },
    );

    app.get(
      '/transactions/:id',
      {
        schema: { params: transactionParamsSchema, response: { 200: transactionResponseSchema } },
      },
      async (request) => toTransactionResponse(await service.get(request.params.id)),
    );

    app.patch(
      '/transactions/:id',
      {
        schema: {
          params: transactionParamsSchema,
          body: changeCategoryBodySchema,
          response: { 200: transactionResponseSchema },
        },
      },
      async (request) =>
        toTransactionResponse(await service.changeCategory(request.params.id, request.body)),
    );
  };
}
