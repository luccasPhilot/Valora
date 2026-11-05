import { z } from 'zod';

// Só os campos que o Valora usa. O objeto original inteiro é guardado em `raw`.
// O SDK entrega datas como Date; as fixtures gravadas, como texto ISO. `z.coerce.date()` aceita os dois.

export const pluggyItemSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  executionStatus: z.string().nullish(),
  error: z.object({ code: z.string() }).nullish(),
  consentExpiresAt: z.coerce.date().nullish(),
  connector: z.object({
    id: z.number().int(),
    name: z.string().min(1),
    imageUrl: z.string().nullish(),
  }),
});

export const pluggyAccountSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['BANK', 'CREDIT']),
  subtype: z.string().nullish(),
  name: z.string(),
  marketingName: z.string().nullish(),
  number: z.string().nullish(),
  balance: z.number(),
  creditData: z
    .object({
      creditLimit: z.number().nullish(),
      availableCreditLimit: z.number().nullish(),
    })
    .nullish(),
});

export const pluggyTransactionSchema = z.object({
  id: z.string().min(1),
  date: z.coerce.date(),
  description: z.string(),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number(),
  amountInAccountCurrency: z.number().nullish(),
  status: z.enum(['PENDING', 'POSTED']).nullish(),
  category: z.string().nullish(),
  creditCardMetadata: z
    .object({
      installmentNumber: z.number().int().nullish(),
      totalInstallments: z.number().int().nullish(),
    })
    .nullish(),
});

export const pluggyInvestmentSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.string().min(1),
  balance: z.number(),
});

export const pluggyPageSchema = z.object({
  results: z.array(z.unknown()),
  page: z.number().int().optional(),
  totalPages: z.number().int().optional(),
});

export const pluggyListSchema = z.array(z.unknown());

export type PluggyItem = z.infer<typeof pluggyItemSchema>;
export type PluggyAccount = z.infer<typeof pluggyAccountSchema>;
export type PluggyTransaction = z.infer<typeof pluggyTransactionSchema>;
export type PluggyInvestment = z.infer<typeof pluggyInvestmentSchema>;
