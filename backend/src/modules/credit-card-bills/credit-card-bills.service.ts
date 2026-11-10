import { addMonthsKeepingDay, todayInSaoPaulo } from '../../shared/dates.js';
import { type BillView, fallbackCurrentBill, selectBills } from './bill-selection.js';
import type {
  CardBill,
  CardInstallment,
  CardRecord,
  CreditCardBillsRepository,
} from './credit-card-bills.repository.js';
import { type InstallmentMonth, projectFutureInstallments } from './installment-projection.js';

// Um plano de parcelas passa de 24 meses só em casos raros; antes disso a âncora está nesta janela.
const INSTALLMENT_LOOKBACK_MONTHS = 24;

export interface CardBills {
  readonly accountId: string;
  readonly accountName: string;
  readonly lastDigits: string | null;
  readonly institutionName: string | null;
  readonly currentBill: BillView | null;
  readonly upcomingBills: readonly BillView[];
  readonly futureInstallments: readonly InstallmentMonth[];
}

export interface CreditCardBillsServiceDependencies {
  readonly repository: CreditCardBillsRepository;
  readonly now: () => Date;
}

function groupByAccount<T extends { readonly accountId: string }>(rows: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    groups.set(row.accountId, [...(groups.get(row.accountId) ?? []), row]);
  }
  return groups;
}

export class CreditCardBillsService {
  constructor(private readonly deps: CreditCardBillsServiceDependencies) {}

  // Sem paginação: são poucos cartões (no máximo 5 bancos, decisão em docs/03-arquitetura.md).
  async overview(): Promise<CardBills[]> {
    const today = todayInSaoPaulo(this.deps.now());
    const cards = await this.deps.repository.findVisibleCards();
    const accountIds = cards.map((card) => card.id);
    const lookbackStart = addMonthsKeepingDay(today, -INSTALLMENT_LOOKBACK_MONTHS);
    const [bills, installments] = await Promise.all([
      this.deps.repository.findBills(accountIds),
      this.deps.repository.findInstallments(accountIds, lookbackStart),
    ]);
    const billsByCard = groupByAccount(bills);
    const installmentsByCard = groupByAccount(installments);
    return cards.map((card) =>
      this.buildCard(card, {
        bills: billsByCard.get(card.id) ?? [],
        installments: installmentsByCard.get(card.id) ?? [],
        today,
      }),
    );
  }

  private buildCard(
    card: CardRecord,
    context: {
      readonly bills: readonly CardBill[];
      readonly installments: readonly CardInstallment[];
      readonly today: string;
    },
  ): CardBills {
    const { bills, installments, today } = context;
    const selected = selectBills(bills, today);
    const currentBill =
      selected.current ??
      fallbackCurrentBill(
        {
          balanceCents: card.balanceCents,
          accountDueDate: card.accountDueDate,
          // As faturas chegam em ordem de vencimento: a última é a mais recente.
          latestBillDueDate: bills.at(-1)?.dueDate ?? null,
        },
        today,
      );
    return {
      accountId: card.id,
      accountName: card.name,
      lastDigits: card.lastDigits,
      institutionName: card.institutionName,
      currentBill,
      upcomingBills: selected.upcoming,
      futureInstallments: projectFutureInstallments(installments, today),
    };
  }
}
