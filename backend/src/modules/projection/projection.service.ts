import { todayInSaoPaulo } from '../../shared/dates.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { BillView } from '../credit-card-bills/bill-selection.js';
import type {
  CardBills,
  CreditCardBillsService,
} from '../credit-card-bills/credit-card-bills.service.js';
import type { PlannedEntriesService } from '../planned-entries/planned-entries.service.js';
import {
  type MonthProjection,
  projectEndOfMonth,
  type ProjectionBill,
  type ProjectionOccurrence,
} from './month-projection.js';

export interface ProjectionResult extends MonthProjection {
  /** Dados que faltam para a conta ficar completa (ex.: cartão sem vencimento). */
  readonly warnings: readonly string[];
}

export interface ProjectionServiceDependencies {
  readonly accounts: Pick<AccountsService, 'overview'>;
  readonly plannedEntries: Pick<PlannedEntriesService, 'overview'>;
  readonly creditCardBills: Pick<CreditCardBillsService, 'overview'>;
  readonly now: () => Date;
}

interface CardBillSources {
  readonly bills: ProjectionBill[];
  readonly warnings: string[];
}

// Atual e próximas faturas do cartão, sem refazer a escolha que o módulo de faturas já faz.
function unsettledBillsOf(card: CardBills): BillView[] {
  const bills = card.currentBill ? [card.currentBill, ...card.upcomingBills] : card.upcomingBills;
  return bills.filter((bill) => bill.status !== 'paid');
}

function collectBillSources(cards: readonly CardBills[]): CardBillSources {
  const sources: CardBillSources = { bills: [], warnings: [] };
  for (const card of cards) {
    for (const bill of unsettledBillsOf(card)) {
      if (bill.dueDate === null) {
        sources.warnings.push(`Fatura do cartão ${card.accountName} sem vencimento informado`);
        continue;
      }
      sources.bills.push({
        description: `Fatura ${card.accountName}`,
        dueDate: bill.dueDate,
        totalCents: bill.totalCents,
        paidCents: bill.paidCents,
        isEstimatedDueDate: bill.isEstimatedDueDate,
      });
    }
  }
  return sources;
}

export class ProjectionService {
  constructor(private readonly deps: ProjectionServiceDependencies) {}

  // Sem paginação: a projeção cobre só o mês atual, uma lista curta (decisão em docs/03-arquitetura.md).
  async projection(): Promise<ProjectionResult> {
    const today = todayInSaoPaulo(this.deps.now());
    const [{ totals }, planned, cards] = await Promise.all([
      this.deps.accounts.overview(),
      this.deps.plannedEntries.overview(),
      this.deps.creditCardBills.overview(),
    ]);
    const occurrences: ProjectionOccurrence[] = planned.occurrences
      .filter((occurrence) => occurrence.status === 'pending')
      .map((occurrence) => ({
        description: occurrence.entry.description,
        date: occurrence.date,
        amountCents: occurrence.entry.amountCents,
      }));
    const { bills, warnings } = collectBillSources(cards);
    const projection = projectEndOfMonth({
      today,
      balanceCents: totals.totalBalanceCents,
      occurrences,
      bills,
    });
    return { ...projection, warnings };
  }
}
