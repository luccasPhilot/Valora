import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /projection. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/projection/projection.routes.ts).

const projectionEventSchema = z.object({
  type: z.enum(['planned_income', 'planned_expense', 'bill']),
  /** Dia em que o valor entra na conta: hoje, se a data prevista já passou. */
  date: z.iso.date(),
  description: z.string(),
  /** Com sinal: negativo = sai dinheiro. */
  amountCents: z.int(),
  isOverdue: z.boolean(),
  /** Só nas faturas: o vencimento foi estimado, não informado pelo banco. */
  isEstimatedDate: z.boolean(),
});

const projectionSchema = z.object({
  /** Hoje, AAAA-MM-DD. */
  date: z.iso.date(),
  startBalanceCents: z.int(),
  plannedIncomeCents: z.int(),
  /** Positivo: é o quanto vai sair. */
  plannedExpenseCents: z.int(),
  /** Positivo: é o quanto vai sair. */
  billsDueCents: z.int(),
  projectedBalanceCents: z.int(),
  lowestBalanceCents: z.int(),
  lowestBalanceDate: z.iso.date(),
  /** Do dia de hoje ao último dia do mês, com o saldo no fim de cada dia. */
  daily: z.array(z.object({ date: z.iso.date(), balanceCents: z.int() })),
  events: z.array(projectionEventSchema),
  /** Dados que faltam para a conta ficar completa (ex.: cartão sem vencimento). */
  warnings: z.array(z.string()),
});

export type Projection = z.infer<typeof projectionSchema>;
export type ProjectionEvent = Projection['events'][number];
export type DailyBalance = Projection['daily'][number];

// Sem paginação: a projeção cobre só o mês atual.
export function getProjection(): Promise<Projection> {
  return apiGet('/projection', projectionSchema);
}
