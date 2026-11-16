import type { NetWorth, NetWorthPoint } from '@/lib/api/net-worth';
import { formatIsoDayMonth } from '@/lib/format';

const PERCENT_SCALE = 1000;
const PERCENT_DECIMALS_DIVISOR = 10;

export const MIN_POINTS_FOR_CHARTS = 2;

export const NET_WORTH_REPORT_FORMULA_NOTE =
  'Patrimônio = contas + investimentos − faturas em aberto, dos bancos ativos. Um banco removido do Valora sai do patrimônio a partir do dia em que foi arquivado. Gastos no cartão ainda fora de fatura fechada não entram.';

export interface PeriodChange {
  readonly cents: number;
  /** Sobre o valor absoluto do primeiro ponto; nulo quando ele é zero e não há base. */
  readonly percent: number | null;
  /** Dia (`AAAA-MM-DD`) do primeiro ponto: a variação é "desde" ele. */
  readonly sinceDate: string;
}

/**
 * Variação do patrimônio do primeiro ao último ponto do período. É aritmética de apresentação sobre
 * o que a API devolveu; com menos de 2 pontos não há variação (nulo).
 */
export function periodChange(points: readonly NetWorthPoint[]): PeriodChange | null {
  const first = points[0];
  const last = points.at(-1);
  if (points.length < MIN_POINTS_FOR_CHARTS || !first || !last) return null;
  const cents = last.netWorthCents - first.netWorthCents;
  const percent =
    first.netWorthCents === 0
      ? null
      : Math.round((cents * PERCENT_SCALE) / Math.abs(first.netWorthCents)) /
        PERCENT_DECIMALS_DIVISOR;
  return { cents, percent, sinceDate: first.date };
}

/**
 * Fatia de investimentos na soma de contas e investimentos (a fatura não entra: não é um ativo),
 * de 0 a 1. Nulo quando a soma não é positiva e a fatia não faz sentido.
 */
export function investmentsShare(current: NetWorth['current']): number | null {
  const assetsCents = current.accountsCents + current.investmentsCents;
  if (assetsCents <= 0) return null;
  return current.investmentsCents / assetsCents;
}

/** Por que não há gráficos ainda: desde quando existe histórico. */
export function describeShortHistory(firstSnapshotDate: string | null): string {
  const rule = 'Os gráficos aparecem quando houver dois meses de dados.';
  if (firstSnapshotDate === null) return `Ainda não há histórico de patrimônio. ${rule}`;
  return `O histórico começa em ${formatIsoDayMonth(firstSnapshotDate)}. ${rule}`;
}

/** "O histórico começa em 04/11", para a nota abaixo do relatório; nulo sem nenhuma foto. */
export function describeHistoryStart(firstSnapshotDate: string | null): string | null {
  if (firstSnapshotDate === null) return null;
  return `O histórico começa em ${formatIsoDayMonth(firstSnapshotDate)}.`;
}
