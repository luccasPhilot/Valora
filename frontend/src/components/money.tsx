import { formatCurrency, formatSignedCurrency } from '@/lib/format';

import { useHideValues } from './hide-values-provider';

export const HIDDEN_MONEY_TEXT = 'R$ ••••';

interface MoneyProps {
  cents: number;
  isSigned?: boolean;
}

// Único jeito de mostrar dinheiro na interface: formata em pt-BR e respeita "ocultar valores".
export function Money({ cents, isSigned = false }: MoneyProps) {
  const { areValuesHidden } = useHideValues();
  if (areValuesHidden) return <span>{HIDDEN_MONEY_TEXT}</span>;
  return <span>{isSigned ? formatSignedCurrency(cents) : formatCurrency(cents)}</span>;
}
