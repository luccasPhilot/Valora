import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import type { CardBills, CreditCardBillsService } from './credit-card-bills.service.js';

const isoDateSchema = z.iso.date();

const billResponseSchema = z.object({
  id: z.uuid().nullable(),
  dueDate: isoDateSchema.nullable(),
  isEstimatedDueDate: z.boolean(),
  closingDate: isoDateSchema.nullable(),
  totalCents: centsSchema,
  paidCents: centsSchema,
  status: z.enum(['open', 'paid', 'overdue']),
});

const cardBillsResponseSchema = z.object({
  accountId: z.uuid(),
  accountName: z.string(),
  lastDigits: z.string().nullable(),
  institutionName: z.string().nullable(),
  currentBill: billResponseSchema.nullable(),
  upcomingBills: z.array(billResponseSchema),
  futureInstallments: z.array(z.object({ month: isoDateSchema, totalCents: centsSchema })),
});

const creditCardBillsResponseSchema = z.object({ items: z.array(cardBillsResponseSchema) });

// DTO explícito: o `raw` do Pluggy nunca sai da API.
function toCardResponse(card: CardBills): z.infer<typeof cardBillsResponseSchema> {
  return {
    accountId: card.accountId,
    accountName: card.accountName,
    lastDigits: card.lastDigits,
    institutionName: card.institutionName,
    currentBill: card.currentBill,
    upcomingBills: [...card.upcomingBills],
    futureInstallments: [...card.futureInstallments],
  };
}

export function creditCardBillsRoutes(service: CreditCardBillsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/credit-card-bills',
      { schema: { response: { 200: creditCardBillsResponseSchema } } },
      async () => ({ items: (await service.overview()).map(toCardResponse) }),
    );
  };
}
