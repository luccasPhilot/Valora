import { firstDayOfMonth, lastDayOfMonth, subtractDays } from '../../shared/dates.js';
import { monthsBetween } from '../../shared/months.js';
import { buildValueChange, type ValueChange } from '../../shared/value-change.js';

/** Quantos dias uma foto continua valendo quando o item não tem foto no dia calculado. */
export const SNAPSHOT_TOLERANCE_DAYS = 7;

export type NetWorthItemType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';

/** `with_archived` soma também o passado dos bancos arquivados; `active_only` só os bancos ativos. */
export type ArchivedScope = 'with_archived' | 'active_only';

export interface SnapshotRow {
  /** Id da conta ou do investimento. */
  readonly itemId: string;
  readonly type: NetWorthItemType;
  readonly isHidden: boolean;
  /** Dia do arquivamento da conexão (fuso de São Paulo); nulo = banco ativo. */
  readonly archivedOn: string | null;
  /** `AAAA-MM-DD`. */
  readonly date: string;
  /** No cartão, é a fatura (positiva). */
  readonly cents: number;
}

interface SnapshotPoint {
  readonly date: string;
  readonly cents: number;
}

export interface NetWorthItem {
  readonly type: NetWorthItemType;
  readonly isHidden: boolean;
  readonly archivedOn: string | null;
  /** Do dia mais antigo para o mais recente. */
  readonly snapshots: readonly SnapshotPoint[];
}

export interface NetWorthParts {
  readonly accountsCents: number;
  readonly investmentsCents: number;
  /** Positivo: é quanto se deve nos cartões, descontado no patrimônio. */
  readonly openBillsCents: number;
  readonly netWorthCents: number;
}

export interface NetWorthPoint extends NetWorthParts {
  /** `AAAA-MM`. */
  readonly month: string;
  /** Dia de referência do mês, `AAAA-MM-DD`. */
  readonly date: string;
}

type PartKey = 'accountsCents' | 'investmentsCents' | 'openBillsCents';

// "Dinheiro" não tem saldo nem foto e nunca entra no patrimônio.
const PART_BY_TYPE: Record<NetWorthItemType, PartKey | null> = {
  checking: 'accountsCents',
  savings: 'accountsCents',
  credit_card: 'openBillsCents',
  investment: 'investmentsCents',
  cash: null,
};

/** Agrupa as linhas (já ordenadas por item e por dia) em um item com suas fotos. */
export function groupSnapshotRows(rows: readonly SnapshotRow[]): NetWorthItem[] {
  const itemsById = new Map<
    string,
    { item: Omit<NetWorthItem, 'snapshots'>; points: SnapshotPoint[] }
  >();
  for (const row of rows) {
    const found = itemsById.get(row.itemId) ?? {
      item: { type: row.type, isHidden: row.isHidden, archivedOn: row.archivedOn },
      points: [],
    };
    found.points.push({ date: row.date, cents: row.cents });
    itemsById.set(row.itemId, found);
  }
  return [...itemsById.values()].map(({ item, points }) => ({ ...item, snapshots: points }));
}

function isCountedOn(item: NetWorthItem, day: string, scope: ArchivedScope): boolean {
  if (item.isHidden || PART_BY_TYPE[item.type] === null) return false;
  if (item.archivedOn === null) return true;
  return scope === 'with_archived' && day < item.archivedOn;
}

/** A foto mais recente até `day`, se tiver no máximo 7 dias. */
function latestSnapshotCents(item: NetWorthItem, day: string): number | null {
  const oldestAllowed = subtractDays(day, SNAPSHOT_TOLERANCE_DAYS);
  let latestCents: number | null = null;
  for (const snapshot of item.snapshots) {
    if (snapshot.date > day) break;
    if (snapshot.date >= oldestAllowed) latestCents = snapshot.cents;
  }
  return latestCents;
}

/**
 * O patrimônio de um dia, item por item: cada conta e cada investimento vale a foto mais recente
 * até o dia (no máximo 7 dias antes), para uma foto que faltou não abrir um buraco na curva.
 */
export function valueOnDay(
  items: readonly NetWorthItem[],
  day: string,
  scope: ArchivedScope = 'with_archived',
): NetWorthParts {
  const totals: Record<PartKey, number> = {
    accountsCents: 0,
    investmentsCents: 0,
    openBillsCents: 0,
  };
  for (const item of items) {
    const part = PART_BY_TYPE[item.type];
    if (part === null || !isCountedOn(item, day, scope)) continue;
    const cents = latestSnapshotCents(item, day);
    if (cents !== null) totals[part] += cents;
  }
  return {
    ...totals,
    netWorthCents: totals.accountsCents + totals.investmentsCents - totals.openBillsCents,
  };
}

/** Os dias do intervalo com foto de pelo menos um item contado, em ordem. */
function snapshotDaysBetween(
  items: readonly NetWorthItem[],
  from: string,
  to: string,
  scope: ArchivedScope,
): string[] {
  const days = new Set<string>();
  for (const item of items) {
    for (const { date } of item.snapshots) {
      if (date >= from && date <= to && isCountedOn(item, date, scope)) days.add(date);
    }
  }
  return [...days].sort();
}

/**
 * O dia que representa o mês: o último, até hoje, com foto de algum item contado. Nulo se o mês não
 * tem nenhuma foto, para o gráfico mostrar só o que foi guardado.
 */
export function pickReferenceDay(
  items: readonly NetWorthItem[],
  month: string,
  today: string,
): string | null {
  const lastDay = lastDayOfMonth(month);
  const days = snapshotDaysBetween(
    items,
    month,
    lastDay < today ? lastDay : today,
    'with_archived',
  );
  return days.at(-1) ?? null;
}

/** Um ponto por mês do intervalo (dia 1 de `from` e de `to`) que tenha foto, do mais antigo ao mais recente. */
export function buildNetWorthSeries(
  items: readonly NetWorthItem[],
  range: { readonly from: string; readonly to: string },
  today: string,
): NetWorthPoint[] {
  return monthsBetween(range.from, range.to).flatMap((month) => {
    const date = pickReferenceDay(items, month, today);
    if (date === null) return [];
    return [{ month: month.slice(0, 7), date, ...valueOnDay(items, date) }];
  });
}

/**
 * Patrimônio de hoje menos o da primeira foto do mês, só com bancos ativos nas duas pontas: um banco
 * arquivado no meio do mês não pode parecer uma queda que não aconteceu.
 */
export function buildMonthChange(
  items: readonly NetWorthItem[],
  currentNetWorthCents: number,
  today: string,
): ValueChange | null {
  const [firstDay] = snapshotDaysBetween(items, firstDayOfMonth(today), today, 'active_only');
  if (firstDay === undefined) return null;
  const firstNetWorthCents = valueOnDay(items, firstDay, 'active_only').netWorthCents;
  return buildValueChange(
    currentNetWorthCents,
    { date: firstDay, cents: firstNetWorthCents },
    today,
  );
}
