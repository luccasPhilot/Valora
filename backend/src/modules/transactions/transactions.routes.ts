import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import {
  ruleSuggestionResponseSchema,
  toRuleSuggestionResponse,
} from '../categories/rule-suggestions.routes.js';
import { UNCATEGORIZED_FILTER } from './transaction-filter-conditions.js';
import { TRANSACTION_TYPES } from './transaction-type-filter.js';
import type { TransactionsModule } from './transactions.module.js';
import type { TransactionRecord } from './transactions.repository.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;
const MAX_TAGS_PER_TRANSACTION = 10;
/** Revisar ou trocar a categoria de até 100 de uma vez (o tamanho de uma página). */
const MAX_BULK_IDS = 100;

// Os filtros da lista e do resumo são os mesmos: o resumo cobre o filtro inteiro, não uma página.
const filterShape = {
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  categoryId: z.union([z.uuid(), z.literal(UNCATEGORIZED_FILTER)]).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  accountId: z.uuid().optional(),
  source: z.enum(['open_finance', 'manual']).optional(),
  possibleDuplicate: z.stringbool().optional(),
  search: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  tagId: z.uuid().optional(),
  // `false` é a caixa "Para revisar".
  reviewed: z.stringbool().optional(),
};

function isPeriodInOrder({ from, to }: { from?: string; to?: string }): boolean {
  return !from || !to || from <= to;
}

const PERIOD_ORDER_ISSUE = {
  message: 'A data inicial não pode ser depois da final',
  path: ['from'],
};

const listQuerySchema = z
  .object({
    ...filterShape,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .refine(isPeriodInOrder, PERIOD_ORDER_ISSUE);

const summaryQuerySchema = z.object(filterShape).refine(isPeriodInOrder, PERIOD_ORDER_ISSUE);

const summaryResponseSchema = z.object({
  incomeCents: z.int(),
  expenseCents: z.int(),
  count: z.int(),
});

const transactionParamsSchema = z.object({ id: z.uuid() });

// Mensagens em português: vão direto para o texto de erro embaixo de cada campo.
const manualFieldsShape = {
  type: z.enum(['income', 'expense']),
  amountCents: centsSchema.positive({ error: 'O valor deve ser maior que zero' }),
  description: z
    .string()
    .trim()
    .min(1, { error: 'Informe uma descrição' })
    .max(MAX_DESCRIPTION_LENGTH, { error: 'A descrição aceita até 120 caracteres' }),
  date: z.iso.date({ error: 'Informe uma data válida' }),
  categoryId: z.uuid({ error: 'Escolha uma categoria' }),
  accountId: z.uuid({ error: 'Escolha uma conta' }),
};

const createBodySchema = z.object(manualFieldsShape);

// Uma só rota para as duas origens: a regra "o banco só muda a categoria" fica no service.
const updateBodySchema = z
  .object({
    ...manualFieldsShape,
    applyAlways: z.boolean(),
    note: z.string().max(MAX_NOTE_LENGTH, { error: 'A nota aceita até 500 caracteres' }).nullable(),
    tagIds: z
      .array(z.uuid())
      .max(MAX_TAGS_PER_TRANSACTION, { error: 'Use até 10 etiquetas' })
      .refine((ids) => new Set(ids).size === ids.length, { error: 'Há etiquetas repetidas' }),
  })
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Envie ao menos um campo para alterar',
  })
  .refine(({ applyAlways, categoryId }) => !applyAlways || categoryId !== undefined, {
    message: 'Escolha a categoria para aplicar sempre',
    path: ['categoryId'],
  });

const duplicateResolutionBodySchema = z.object({ action: z.enum(['merge', 'keep_both']) });

const transactionIdsSchema = z
  .array(z.uuid())
  .min(1, { error: 'Escolha ao menos uma transação' })
  .max(MAX_BULK_IDS, { error: 'Escolha até 100 transações de uma vez' })
  .refine((ids) => new Set(ids).size === ids.length, { error: 'Há transações repetidas' });

const reviewBodySchema = z.object({ transactionIds: transactionIdsSchema });

const reviewAllBodySchema = z.object({ until: z.iso.datetime({ offset: true }) });

const bulkCategoryBodySchema = z.object({
  transactionIds: transactionIdsSchema,
  categoryId: z.uuid({ error: 'Escolha uma categoria' }),
});

const reviewCountResponseSchema = z.object({ count: z.int() });
const reviewedCountResponseSchema = z.object({ reviewedCount: z.int() });
const bulkCategoryResponseSchema = z.object({
  updatedCount: z.int(),
  ruleSuggestion: ruleSuggestionResponseSchema.nullable(),
});

export const transactionResponseSchema = z.object({
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
  possibleDuplicateOfId: z.uuid().nullable(),
  note: z.string().nullable(),
  tags: z.array(z.object({ id: z.uuid(), name: z.string() })),
});

const transactionListResponseSchema = z.object({
  items: z.array(transactionResponseSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
  loadedAt: z.iso.datetime(),
});

const transactionUpdateResponseSchema = transactionResponseSchema.extend({
  ruleSuggestion: ruleSuggestionResponseSchema.nullable(),
});

// Lista os campos um a um: o JSON bruto do Pluggy nunca sai da API.
export function toTransactionResponse(
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
    possibleDuplicateOfId: transaction.possibleDuplicateOfId,
    note: transaction.note,
    tags: transaction.tags.map(({ id, name }) => ({ id, name })),
  };
}

export function transactionsRoutes({
  transactionsService,
  writesService,
  duplicatesService,
  reviewService,
}: TransactionsModule): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/transactions',
      {
        schema: { querystring: listQuerySchema, response: { 200: transactionListResponseSchema } },
      },
      async (request) => {
        const { page, limit, ...filters } = request.query;
        const result = await transactionsService.list(filters, { page, limit });
        return {
          items: result.items.map(toTransactionResponse),
          pagination: { page, limit, total: result.total },
          loadedAt: result.loadedAt.toISOString(),
        };
      },
    );

    app.get(
      '/transactions/review-count',
      { schema: { response: { 200: reviewCountResponseSchema } } },
      async () => ({ count: await reviewService.countUnreviewed() }),
    );

    app.post(
      '/transactions/review',
      { schema: { body: reviewBodySchema, response: { 200: reviewedCountResponseSchema } } },
      async (request) => ({
        reviewedCount: await reviewService.markReviewed(request.body.transactionIds),
      }),
    );

    app.post(
      '/transactions/review-all',
      { schema: { body: reviewAllBodySchema, response: { 200: reviewedCountResponseSchema } } },
      async (request) => ({
        reviewedCount: await reviewService.markInboxReviewedUntil(new Date(request.body.until)),
      }),
    );

    app.patch(
      '/transactions/category',
      { schema: { body: bulkCategoryBodySchema, response: { 200: bulkCategoryResponseSchema } } },
      async (request) => {
        const result = await transactionsService.changeCategoryOfMany(request.body);
        return {
          updatedCount: result.updatedCount,
          ruleSuggestion: result.ruleSuggestion && toRuleSuggestionResponse(result.ruleSuggestion),
        };
      },
    );

    app.get(
      '/transactions/summary',
      { schema: { querystring: summaryQuerySchema, response: { 200: summaryResponseSchema } } },
      async (request) => {
        const { incomeCents, expenseCents, count } = await transactionsService.summarize(
          request.query,
        );
        return { incomeCents, expenseCents, count };
      },
    );

    app.get(
      '/transactions/:id',
      {
        schema: { params: transactionParamsSchema, response: { 200: transactionResponseSchema } },
      },
      async (request) => toTransactionResponse(await transactionsService.get(request.params.id)),
    );

    app.post(
      '/transactions',
      { schema: { body: createBodySchema, response: { 201: transactionResponseSchema } } },
      async (request, reply) => {
        const created = await writesService.create(request.body);
        return reply.status(201).send(toTransactionResponse(created));
      },
    );

    app.patch(
      '/transactions/:id',
      {
        schema: {
          params: transactionParamsSchema,
          body: updateBodySchema,
          response: { 200: transactionUpdateResponseSchema },
        },
      },
      async (request) => {
        const { transaction, ruleSuggestion } = await writesService.update(
          request.params.id,
          request.body,
        );
        return {
          ...toTransactionResponse(transaction),
          ruleSuggestion: ruleSuggestion && toRuleSuggestionResponse(ruleSuggestion),
        };
      },
    );

    app.delete(
      '/transactions/:id',
      { schema: { params: transactionParamsSchema } },
      async (request, reply) => {
        await writesService.remove(request.params.id);
        return reply.status(204).send();
      },
    );

    app.post(
      '/transactions/:id/duplicate-resolution',
      {
        schema: {
          params: transactionParamsSchema,
          body: duplicateResolutionBodySchema,
          response: { 200: transactionResponseSchema },
        },
      },
      async (request) =>
        toTransactionResponse(
          await duplicatesService.resolve(request.params.id, request.body.action),
        ),
    );
  };
}
