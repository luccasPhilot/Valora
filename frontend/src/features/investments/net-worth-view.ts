import type { SegmentedOption } from '@/components/segmented-control';
import { firstDayOfMonth, todayInSaoPaulo } from '@/lib/dates';
import { formatIsoDayMonth } from '@/lib/format';

export type NetWorthPeriod = '6' | '12';

export const DEFAULT_NET_WORTH_PERIOD: NetWorthPeriod = '12';

export const NET_WORTH_PERIOD_OPTIONS: readonly SegmentedOption<NetWorthPeriod>[] = [
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
];

export const NET_WORTH_FORMULA_NOTE =
  'Patrimônio = contas + investimentos − faturas em aberto. Gastos no cartão ainda fora de fatura fechada não entram.';

export const MIN_POINTS_FOR_CHART = 2;

/** O primeiro mês (`AAAA-MM`) de uma janela de `period` meses que termina no mês atual. */
export function netWorthFrom(period: NetWorthPeriod, today: string = todayInSaoPaulo()): string {
  return firstDayOfMonth(today, -(Number(period) - 1)).slice(0, 7);
}

/** Por que não há gráfico ainda: desde quando existe histórico, ou que ainda não existe. */
export function describeShortHistory(firstSnapshotDate: string | null): string {
  const rule = 'O gráfico aparece quando houver dois meses de dados.';
  if (firstSnapshotDate === null) return `Ainda não há histórico de patrimônio. ${rule}`;
  return `O histórico começa em ${formatIsoDayMonth(firstSnapshotDate)}. ${rule}`;
}
