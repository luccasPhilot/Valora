// O campo de valor guarda só os dígitos digitados ("8990" mostra R$ 89,90). Assim o valor nunca
// passa por um número com casas decimais: os centavos saem de `parseInt` sobre esses dígitos.

/** Até R$ 99.999.999,99. */
export const MAX_MONEY_DIGITS = 10;

const NON_DIGITS_PATTERN = /\D/g;
const LEADING_ZEROS_PATTERN = /^0+/;
const RADIX = 10;

/**
 * Tira tudo o que não é dígito e os zeros à esquerda. Devolve `null` se passar do máximo, para o
 * campo ignorar a digitação em vez de cortar o valor.
 */
export function extractMoneyDigits(text: string): string | null {
  const digits = text.replace(NON_DIGITS_PATTERN, '').replace(LEADING_ZEROS_PATTERN, '');
  return digits.length > MAX_MONEY_DIGITS ? null : digits;
}

export function digitsToCents(digits: string): number {
  return digits === '' ? 0 : Number.parseInt(digits, RADIX);
}

export function centsToDigits(cents: number): string {
  return cents > 0 ? String(cents) : '';
}
