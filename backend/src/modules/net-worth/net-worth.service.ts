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

/** O que o Início precisa: o patrimônio de hoje e a variação no mês, sem a série mensal. */
export interface NetWorthSummary {
  readonly current: NetWorthCurrent;
  readonly monthChange: ValueChange | null;
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
    const [current, snapshotRows, firstSnapshotDate] = await Promise.all([
      this.findCurrent(today),
      this.deps.netWorth.findSnapshots(subtractDays(firstDay, SNAPSHOT_TOLERANCE_DAYS), today),
      this.deps.netWorth.findFirstSnapshotDate(),
    ]);
    const items = groupSnapshotRows(snapshotRows);
    return {
      current,
      points: buildNetWorthSeries(items, range, today),
      monthChange: buildMonthChange(items, current.netWorthCents, today),
      firstSnapshotDate,
    };
  }

  /** Mesmo `current` e `monthChange` de `overview()`, lendo só as fotos do mês atual. */
  async summary(): Promise<NetWorthSummary> {
    const today = todayInSaoPaulo(this.deps.now());
    const monthStart = firstDayOfMonth(today);
    const [current, snapshotRows] = await Promise.all([
      this.findCurrent(today),
      this.deps.netWorth.findSnapshots(subtractDays(monthStart, SNAPSHOT_TOLERANCE_DAYS), today),
    ]);
    return {
      current,
      monthChange: buildMonthChange(groupSnapshotRows(snapshotRows), current.netWorthCents, today),
    };
  }

  private async findCurrent(today: string): Promise<NetWorthCurrent> {
    const [{ totals }, investments] = await Promise.all([
      this.deps.accounts.overview(),
      this.deps.investments.overview(),
    ]);
    return buildCurrent(today, {
      accountsCents: totals.totalBalanceCents,
      investmentsCents: investments.totals.totalCents,
      openBillsCents: totals.openCreditCardBillsCents,
    });
  }
}

function buildCurrent(today: string, parts: Omit<NetWorthParts, 'netWorthCents'>): NetWorthCurrent {
  return {
    date: today,
    ...parts,
    netWorthCents: parts.accountsCents + parts.investmentsCents - parts.openBillsCents,
  };
}
