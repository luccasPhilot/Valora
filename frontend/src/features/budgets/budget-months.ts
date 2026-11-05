import { firstDayOfMonth, lastDayOfMonth } from '@/lib/dates';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_LENGTH = 'AAAA-MM'.length;

/** O mês de uma data `AAAA-MM-DD`, no formato `AAAA-MM` que a API usa. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, MONTH_LENGTH);
}

/** Lê o mês da URL; um valor ausente ou inválido volta para `fallback`. */
export function parseMonth(value: string | null, fallback: string): string {
  return value !== null && MONTH_PATTERN.test(value) ? value : fallback;
}

/** O mês `monthOffset` meses depois (ou antes, se negativo) de `month`. */
export function shiftMonth(month: string, monthOffset: number): string {
  return monthOf(firstDayOfMonth(`${month}-01`, monthOffset));
}

/** Primeiro e último dia do mês, para filtrar as transações da categoria naquele mês. */
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: lastDayOfMonth(`${month}-01`) };
}

/** Endereço de Transações filtrado pela categoria e pelo mês do orçamento. */
export function transactionsLinkFor(categoryId: string, month: string): string {
  const { from, to } = monthRange(month);
  const params = new URLSearchParams({ period: 'custom', from, to, category: categoryId });
  return `/transacoes?${params.toString()}`;
}
