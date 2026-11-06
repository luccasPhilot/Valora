import { firstDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import {
  NotFoundError,
  TransactionAlreadyLinkedError,
  TransactionNotCompatibleError,
  ValidationError,
} from '../../shared/errors.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import {
  assertCategoryIsSelectable,
  assertCategoryMatchesType,
  type MoneyDirection,
} from '../categories/category-availability.js';
import { signedAmountCents } from '../transactions/manual-transaction-fields.js';
import { rankMatchCandidates } from './match-candidates.js';
import { expandOccurrences } from './occurrence-expansion.js';
import type {
  DecisionRecord,
  LinkableTransaction,
  LinkedTransaction,
  PlannedEntriesRepository,
  PlannedEntryRecord,
  Recurrence,
} from './planned-entries.repository.js';

export type OccurrenceStatus = 'pending' | 'realized' | 'skipped';

/** O que o formulário envia: o valor é positivo e o sinal vem do tipo. */
export interface PlannedEntryInput {
  readonly description: string;
  readonly type: MoneyDirection;
  readonly amountCents: number;
  readonly categoryId: string;
  readonly dayOfMonth: number;
  readonly recurrence: Recurrence;
  readonly startMonth: string;
  readonly endMonth: string | null;
  readonly isActive: boolean;
}

export interface PlannedOccurrence {
  readonly plannedEntryId: string;
  /** Dia 1 do mês da ocorrência. */
  readonly month: string;
  /** Data prevista, já limitada ao último dia do mês. */
  readonly date: string;
  readonly entry: PlannedEntryRecord;
  readonly status: OccurrenceStatus;
  readonly decidedAt: Date | null;
  readonly transaction: LinkedTransaction | null;
  /** Só nas pendentes: até 5 transações para vincular. Nada é vinculado sozinho. */
  readonly candidates: readonly LinkedTransaction[];
}

export interface StatusTotals {
  readonly incomeCents: number;
  /** Positivo: é o quanto vai sair. */
  readonly expenseCents: number;
}

export interface MonthOverview {
  readonly month: string;
  readonly occurrences: readonly PlannedOccurrence[];
  readonly totals: Readonly<Record<OccurrenceStatus, StatusTotals>>;
  /** Previsões pausadas: não geram ocorrências, mas precisam de um lugar para serem reativadas. */
  readonly pausedEntries: readonly PlannedEntryRecord[];
}

export type OccurrenceDecision =
  { readonly action: 'realize'; readonly transactionId?: string } | { readonly action: 'skip' };

export interface PlannedEntriesServiceDependencies {
  readonly entries: PlannedEntriesRepository;
  readonly categories: CategoriesRepository;
  readonly now: () => Date;
}

const EMPTY_TOTALS: StatusTotals = { incomeCents: 0, expenseCents: 0 };
const MONTH_PREFIX_LENGTH = 7;

function toFields(input: PlannedEntryInput) {
  return {
    description: input.description,
    amountCents: signedAmountCents(input.type, input.amountCents),
    categoryId: input.categoryId,
    dayOfMonth: input.dayOfMonth,
    recurrence: input.recurrence,
    startMonth: input.startMonth,
    endMonth: input.endMonth,
    isActive: input.isActive,
  };
}

function toCandidate(transaction: LinkableTransaction): LinkedTransaction {
  return {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amountCents: transaction.amountCents,
  };
}

function addToTotals(totals: StatusTotals, amountCents: number): StatusTotals {
  return amountCents > 0
    ? { ...totals, incomeCents: totals.incomeCents + amountCents }
    : { ...totals, expenseCents: totals.expenseCents - amountCents };
}

function sumTotals(occurrences: readonly PlannedOccurrence[]) {
  const totals: Record<OccurrenceStatus, StatusTotals> = {
    pending: EMPTY_TOTALS,
    realized: EMPTY_TOTALS,
    skipped: EMPTY_TOTALS,
  };
  for (const occurrence of occurrences) {
    totals[occurrence.status] = addToTotals(
      totals[occurrence.status],
      occurrence.entry.amountCents,
    );
  }
  return totals;
}

function byDateThenDescription(first: PlannedOccurrence, second: PlannedOccurrence): number {
  return (
    first.date.localeCompare(second.date) ||
    first.entry.description.localeCompare(second.entry.description, 'pt-BR')
  );
}

export class PlannedEntriesService {
  constructor(private readonly deps: PlannedEntriesServiceDependencies) {}

  /** Ocorrências do mês, calculadas na hora. `month` é o dia 1; sem ele, o mês atual em São Paulo. */
  async overview(month: string = this.currentMonth()): Promise<MonthOverview> {
    const [activeEntries, pausedEntries, decisions] = await Promise.all([
      this.deps.entries.findByActiveState(true),
      this.deps.entries.findByActiveState(false),
      this.deps.entries.findDecisions(month),
    ]);
    const decisionsByEntry = new Map(
      decisions.map((decision) => [decision.plannedEntryId, decision]),
    );
    const drafts = activeEntries.flatMap((entry) =>
      expandOccurrences(entry, month).map((date) => ({
        entry,
        date,
        decision: decisionsByEntry.get(entry.id) ?? null,
      })),
    );
    const hasPending = drafts.some((draft) => draft.decision === null);
    const monthTransactions = hasPending
      ? await this.deps.entries.findTransactionsOfMonth(month)
      : [];
    const occurrences = drafts
      .map((draft) => this.toOccurrence(draft, month, monthTransactions))
      .sort(byDateThenDescription);
    return { month, occurrences, totals: sumTotals(occurrences), pausedEntries };
  }

  async create(input: PlannedEntryInput): Promise<PlannedEntryRecord> {
    await this.assertCategoryIsAllowed(input);
    const plannedEntryId = await this.deps.entries.insert(toFields(input));
    return this.get(plannedEntryId);
  }

  async update(plannedEntryId: string, input: PlannedEntryInput): Promise<PlannedEntryRecord> {
    await this.get(plannedEntryId);
    await this.assertCategoryIsAllowed(input);
    await this.deps.entries.update(plannedEntryId, toFields(input));
    return this.get(plannedEntryId);
  }

  async remove(plannedEntryId: string): Promise<void> {
    if (await this.deps.entries.delete(plannedEntryId)) return;
    throw new NotFoundError(`Previsão ${plannedEntryId} não encontrada`);
  }

  /** Realizar (com ou sem transação) ou pular o mês. Decidir de novo substitui a decisão anterior. */
  async decide(
    plannedEntryId: string,
    month: string,
    decision: OccurrenceDecision,
  ): Promise<PlannedOccurrence> {
    const entry = await this.getEntryWithOccurrenceIn(plannedEntryId, month);
    const transactionId = decision.action === 'realize' ? (decision.transactionId ?? null) : null;
    if (transactionId !== null) await this.assertCanLink(entry, month, transactionId);
    await this.deps.entries.upsertDecision({
      plannedEntryId,
      month,
      status: decision.action === 'realize' ? 'realized' : 'skipped',
      transactionId,
    });
    return this.occurrenceOf(plannedEntryId, month);
  }

  /** Volta a ocorrência para pendente e solta o vínculo. */
  async undo(plannedEntryId: string, month: string): Promise<void> {
    await this.getEntryWithOccurrenceIn(plannedEntryId, month);
    if (await this.deps.entries.deleteDecision(plannedEntryId, month)) return;
    throw new NotFoundError(
      `A ocorrência de ${month.slice(0, MONTH_PREFIX_LENGTH)} da previsão ${plannedEntryId} não tem decisão para desfazer`,
    );
  }

  private currentMonth(): string {
    return firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
  }

  private toOccurrence(
    draft: { entry: PlannedEntryRecord; date: string; decision: DecisionRecord | null },
    month: string,
    monthTransactions: readonly LinkableTransaction[],
  ): PlannedOccurrence {
    const { entry, date, decision } = draft;
    const candidates = decision
      ? []
      : rankMatchCandidates(
          { date, amountCents: entry.amountCents, categoryId: entry.categoryId },
          monthTransactions,
        ).map(toCandidate);
    return {
      plannedEntryId: entry.id,
      month,
      date,
      entry,
      status: decision?.status ?? 'pending',
      decidedAt: decision?.decidedAt ?? null,
      transaction: decision?.transaction ?? null,
      candidates,
    };
  }

  private async occurrenceOf(plannedEntryId: string, month: string): Promise<PlannedOccurrence> {
    const { occurrences } = await this.overview(month);
    const occurrence = occurrences.find((candidate) => candidate.plannedEntryId === plannedEntryId);
    if (!occurrence) {
      throw new Error(`A ocorrência de ${month} da previsão ${plannedEntryId} não foi encontrada`);
    }
    return occurrence;
  }

  private async get(plannedEntryId: string): Promise<PlannedEntryRecord> {
    const entry = await this.deps.entries.findById(plannedEntryId);
    if (!entry) throw new NotFoundError(`Previsão ${plannedEntryId} não encontrada`);
    return entry;
  }

  private async getEntryWithOccurrenceIn(
    plannedEntryId: string,
    month: string,
  ): Promise<PlannedEntryRecord> {
    const entry = await this.get(plannedEntryId);
    if (expandOccurrences(entry, month).length > 0) return entry;
    throw new NotFoundError(
      `A previsão ${plannedEntryId} não tem ocorrência em ${month.slice(0, MONTH_PREFIX_LENGTH)}`,
    );
  }

  private async assertCategoryIsAllowed(input: PlannedEntryInput): Promise<void> {
    await assertCategoryIsSelectable(this.deps.categories, input.categoryId);
    await assertCategoryMatchesType(this.deps.categories, input.categoryId, input.type);
  }

  // Do mesmo mês, com o mesmo sinal e livre. A sugestão já filtra assim, mas o vínculo é pedido pelo
  // cliente, então a API confere de novo: nunca confia no que a tela mostrou.
  private async assertCanLink(
    entry: PlannedEntryRecord,
    month: string,
    transactionId: string,
  ): Promise<void> {
    const transaction = await this.deps.entries.findTransaction(transactionId);
    if (!transaction) {
      throw new ValidationError(`Transação ${transactionId} não existe`, {
        details: [{ field: 'transactionId', message: 'A transação não existe' }],
      });
    }
    const isSameMonth =
      transaction.date.slice(0, MONTH_PREFIX_LENGTH) === month.slice(0, MONTH_PREFIX_LENGTH);
    const isSameSign = Math.sign(transaction.amountCents) === Math.sign(entry.amountCents);
    if (!isSameMonth || !isSameSign) {
      throw new TransactionNotCompatibleError(
        `A transação ${transactionId} não serve para a previsão ${entry.id}: precisa ser do mesmo mês e do mesmo tipo`,
      );
    }
    const link = await this.deps.entries.findLinkOf(transactionId);
    const isLinkedElsewhere =
      link !== null && (link.plannedEntryId !== entry.id || link.month !== month);
    if (isLinkedElsewhere) {
      throw new TransactionAlreadyLinkedError(
        `A transação ${transactionId} já está vinculada a outra ocorrência`,
      );
    }
  }
}
