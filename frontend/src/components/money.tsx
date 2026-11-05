import { formatCurrency, formatCurrencyTrimmed, formatSignedCurrency } from '@/lib/format';

import { useHideValues } from './hide-values-provider';

export const HIDDEN_MONEY_TEXT = 'R$ ••••';

interface MoneyProps {
  cents: number;
  isSigned?: boolean;
  /** "R$ 410" em vez de "R$ 410,00" quando não há centavos; usado nos textos de orçamento. */
  isTrimmed?: boolean;
}

// Único jeito de mostrar dinheiro na interface: formata em pt-BR e respeita "ocultar valores".
export function Money({ cents, isSigned = false, isTrimmed = false }: MoneyProps) {
  const { areValuesHidden } = useHideValues();
  if (areValuesHidden) return <span>{HIDDEN_MONEY_TEXT}</span>;
  if (isSigned) return <span>{formatSignedCurrency(cents)}</span>;
  return <span>{isTrimmed ? formatCurrencyTrimmed(cents) : formatCurrency(cents)}</span>;
}
