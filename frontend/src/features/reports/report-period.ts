import type { SegmentedOption } from '@/components/segmented-control';
import { firstDayOfMonth, todayInSaoPaulo } from '@/lib/dates';

export type ReportPeriod = '6m' | '12m' | '24m' | 'ano';

export const DEFAULT_REPORT_PERIOD: ReportPeriod = '12m';
export const LONGEST_REPORT_PERIOD: ReportPeriod = '24m';

export const REPORT_PERIOD_OPTIONS: readonly SegmentedOption<ReportPeriod>[] = [
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: '24m', label: '24 meses' },
  { value: 'ano', label: 'Este ano' },
];

const MONTHS_BY_PRESET: Readonly<Record<Exclude<ReportPeriod, 'ano'>, number>> = {
  '6m': 6,
  '12m': 12,
  '24m': 24,
};

export interface ReportRange {
  /** Primeiro mês, `AAAA-MM`. */
  readonly from: string;
  /** Último mês (o atual), `AAAA-MM`. */
  readonly to: string;
}

/** O valor de `?periodo=` da URL; qualquer coisa que não seja um preset cai no padrão. */
export function parseReportPeriod(value: string | null): ReportPeriod {
  return (
    REPORT_PERIOD_OPTIONS.find((option) => option.value === value)?.value ?? DEFAULT_REPORT_PERIOD
  );
}

/** Os meses do período, sempre terminando no mês atual em São Paulo. "Este ano" vai de janeiro ao mês atual. */
export function reportRange(period: ReportPeriod, today: string = todayInSaoPaulo()): ReportRange {
  const to = today.slice(0, 7);
  if (period === 'ano') return { from: `${today.slice(0, 4)}-01`, to };
  const from = firstDayOfMonth(today, -(MONTHS_BY_PRESET[period] - 1)).slice(0, 7);
  return { from, to };
}

/** Texto do período para legendas: "últimos 12 meses" ou "este ano". */
export function describeReportPeriod(period: ReportPeriod): string {
  if (period === 'ano') return 'este ano';
  return `últimos ${MONTHS_BY_PRESET[period]} meses`;
}

/**
 * Verdadeiro quando os dados começam depois do primeiro mês do período: pedir 24 meses com 8 de
 * histórico devolve 8, e a tela precisa dizer isso. `firstMonth` é `AAAA-MM`.
 */
export function isHistoryShorterThanPeriod(
  firstMonth: string,
  period: ReportPeriod,
  today: string = todayInSaoPaulo(),
): boolean {
  return firstMonth > reportRange(period, today).from;
}
