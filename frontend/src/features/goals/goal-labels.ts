import { formatMonthName } from '@/lib/format';

const YEAR_LENGTH = 4;
const MONTH_END_INDEX = 7;

export const NO_PACE_LABEL = 'Sem ritmo ainda — registre um aporte';
export const COMPLETED_LABEL = 'Concluída';
export const TOO_FAR_LABEL = 'No ritmo atual, leva mais de 50 anos para chegar';

/** "mar/2027": mês abreviado sem o ponto do Intl, e o ano. */
export function formatEstimatedMonth(isoDate: string): string {
  const monthName = formatMonthName(isoDate.slice(0, MONTH_END_INDEX)).replace('.', '');
  return `${monthName}/${isoDate.slice(0, YEAR_LENGTH)}`;
}

export const CONTRIBUTION_KIND_LABELS = {
  initial: 'Valor inicial',
  deposit: 'Aporte',
  withdrawal: 'Retirada',
} as const;
