import { z } from 'zod';

import { apiDelete, apiGet, apiPost, apiPut } from '../api-client';

// Contrato de /planned-entries. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/planned-entries/planned-entries.routes.ts).

const recurrenceSchema = z.enum(['none', 'monthly', 'yearly']);
const occurrenceStatusSchema = z.enum(['pending', 'realized', 'skipped']);

const plannedEntrySchema = z.object({
  id: z.uuid(),
  description: z.string(),
  /** Com sinal: negativo = despesa prevista. */
  amountCents: z.int(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  dayOfMonth: z.int(),
  recurrence: recurrenceSchema,
  /** AAAA-MM. */
  startMonth: z.string(),
  /** AAAA-MM; nulo = sem fim. */
  endMonth: z.string().nullable(),
  isActive: z.boolean(),
});

const linkedTransactionSchema = z.object({
  id: z.uuid(),
  date: z.string(),
  description: z.string(),
  amountCents: z.int(),
});

const occurrenceSchema = z.object({
  plannedEntryId: z.uuid(),
  /** AAAA-MM. */
  month: z.string(),
  /** Data prevista, AAAA-MM-DD. */
  date: z.string(),
  entry: plannedEntrySchema,
  status: occurrenceStatusSchema,
  decidedAt: z.iso.datetime().nullable(),
  /** Nulo se foi realizada sem vínculo, ou se a transação vinculada foi excluída. */
  transaction: linkedTransactionSchema.nullable(),
  /** Só nas pendentes: até 5 transações para vincular. */
  candidates: z.array(linkedTransactionSchema),
});

const statusTotalsSchema = z.object({
  incomeCents: z.int(),
  /** Positivo: é o quanto vai sair. */
  expenseCents: z.int(),
});

const monthOverviewSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  items: z.array(occurrenceSchema),
  totals: z.object({
    pending: statusTotalsSchema,
    realized: statusTotalsSchema,
    skipped: statusTotalsSchema,
  }),
  pausedEntries: z.array(plannedEntrySchema),
});

export type PlannedEntry = z.infer<typeof plannedEntrySchema>;
export type Recurrence = PlannedEntry['recurrence'];
export type PlannedOccurrence = z.infer<typeof occurrenceSchema>;
export type OccurrenceStatus = PlannedOccurrence['status'];
export type LinkedTransaction = z.infer<typeof linkedTransactionSchema>;
export type MonthTotals = z.infer<typeof monthOverviewSchema>['totals'];
export type MonthOverview = z.infer<typeof monthOverviewSchema>;

/** O que o formulário envia: o valor é positivo e o sinal vem do tipo. */
export interface PlannedEntryInput {
  readonly description: string;
  readonly type: 'income' | 'expense';
  readonly amountCents: number;
  readonly categoryId: string;
  readonly dayOfMonth: number;
  readonly recurrence: Recurrence;
  readonly startMonth: string;
  readonly endMonth: string | null;
  readonly isActive: boolean;
}

export type OccurrenceDecision =
  { readonly action: 'realize'; readonly transactionId?: string } | { readonly action: 'skip' };

// Sem paginação: são dezenas de previsões no máximo.
export function getPlannedEntries(month: string): Promise<MonthOverview> {
  return apiGet(`/planned-entries?month=${month}`, monthOverviewSchema);
}

export function createPlannedEntry(input: PlannedEntryInput): Promise<PlannedEntry> {
  return apiPost('/planned-entries', input, plannedEntrySchema);
}

export function updatePlannedEntry(id: string, input: PlannedEntryInput): Promise<PlannedEntry> {
  return apiPut(`/planned-entries/${id}`, input, plannedEntrySchema);
}

export function deletePlannedEntry(id: string): Promise<void> {
  return apiDelete(`/planned-entries/${id}`);
}

export function decideOccurrence(
  id: string,
  month: string,
  decision: OccurrenceDecision,
): Promise<PlannedOccurrence> {
  return apiPut(`/planned-entries/${id}/occurrences/${month}`, decision, occurrenceSchema);
}

export function undoOccurrence(id: string, month: string): Promise<void> {
  return apiDelete(`/planned-entries/${id}/occurrences/${month}`);
}
