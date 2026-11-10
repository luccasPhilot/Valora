import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /credit-card-bills. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/credit-card-bills/credit-card-bills.routes.ts).

const billSchema = z.object({
  /** Nulo na fatura montada a partir do saldo do cartão, quando o banco não manda faturas. */
  id: z.uuid().nullable(),
  /** Nulo quando o banco não informa o vencimento. */
  dueDate: z.iso.date().nullable(),
  /** Vencimento repetido a partir do dia da última fatura, não informado pelo banco. */
  isEstimatedDueDate: z.boolean(),
  closingDate: z.iso.date().nullable(),
  totalCents: z.int(),
  paidCents: z.int(),
  status: z.enum(['open', 'paid', 'overdue']),
});

const cardBillsSchema = z.object({
  accountId: z.uuid(),
  accountName: z.string(),
  lastDigits: z.string().nullable(),
  institutionName: z.string().nullable(),
  currentBill: billSchema.nullable(),
  upcomingBills: z.array(billSchema),
  /** Parcelas que ainda virão, somadas por mês (dia 1 do mês). */
  futureInstallments: z.array(z.object({ month: z.iso.date(), totalCents: z.int() })),
});

const creditCardBillsSchema = z.object({ items: z.array(cardBillsSchema) });

export type Bill = z.infer<typeof billSchema>;
export type BillStatus = Bill['status'];
export type CardBills = z.infer<typeof cardBillsSchema>;
export type InstallmentMonth = CardBills['futureInstallments'][number];

// Sem paginação: são poucos cartões (no máximo 5 bancos).
export async function getCreditCardBills(): Promise<CardBills[]> {
  const { items } = await apiGet('/credit-card-bills', creditCardBillsSchema);
  return items;
}
