import { firstDayOfMonth, subtractDays, todayInSaoPaulo } from '../../shared/dates.js';
import { type MonthRangeQuery, parseMonthRange } from '../../shared/month-range.js';
import type { ValueChange } from '../../shared/value-change.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { InvestmentsService } from '../investments/investments.service.js';
import type { NetWorthRepository } from './net-worth.repository.js';
import {
  buildMonthChange,
  buildNetWorthSeries,
  groupSnapshotRows,
  type NetWorthParts,
  type NetWorthPoint,
  SNAPSHOT_TOLERANCE_DAYS,
} from './net-worth-calculations.js';

export interface NetWorthCurrent extends NetWorthParts {
  /** Hoje, em São Paulo (`AAAA-MM-DD`). */
  readonly date: string;
}

export interface NetWorthOverview {
  readonly current: NetWorthCurrent;
  readonly points: readonly NetWorthPoint[];
  readonly monthChange: ValueChange | null;
  /** Dia da foto mais antiga guardada; nulo sem nenhuma foto. */
  readonly firstSnapshotDate: string | null;
}

export interface NetWorthServiceDependencies {
  readonly netWorth: NetWorthRepository;
  readonly accounts: Pick<AccountsService, 'overview'>;
  readonly investments: Pick<InvestmentsService, 'overview'>;
  readonly now: () => Date;
}

export class NetWorthService {
  constructor(private readonly deps: NetWorthServiceDependencies) {}

  async overview(query: MonthRangeQuery): Promise<NetWorthOverview> {
    const today = todayInSaoPaulo(this.deps.now());
    const range = parseMonthRange(query, today);
    // A janela também cobre o mês atual (para a variação) e os 7 dias de tolerância antes do início.
    const firstDay = range.from < firstDayOfMonth(today) ? range.from : firstDayOfMonth(today);
    const [{ totals }, investments, snapshotRows, firstSnapshotDate] = await Promise.all([
      this.deps.accounts.overview(),
      this.deps.investments.overview(),
      this.deps.netWorth.findSnapshots(subtractDays(firstDay, SNAPSHOT_TOLERANCE_DAYS), today),
      this.deps.netWorth.findFirstSnapshotDate(),
    ]);
    const current = buildCurrent(today, {
      accountsCents: totals.totalBalanceCents,
      investmentsCents: investments.totals.totalCents,
      openBillsCents: totals.openCreditCardBillsCents,
    });
    const items = groupSnapshotRows(snapshotRows);
    return {
      current,
      points: buildNetWorthSeries(items, range, today),
      monthChange: buildMonthChange(items, current.netWorthCents, today),
      firstSnapshotDate,
    };
  }
}

function buildCurrent(today: string, parts: Omit<NetWorthParts, 'netWorthCents'>): NetWorthCurrent {
  return {
    date: today,
    ...parts,
    netWorthCents: parts.accountsCents + parts.investmentsCents - parts.openBillsCents,
  };
}
