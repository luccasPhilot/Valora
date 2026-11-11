import { z } from 'zod';

import { firstDayOfMonth } from './dates.js';
import { ValidationError } from './errors.js';
import { monthSchema } from './month-schema.js';
import { countMonthsBetween, monthsEndingAt } from './months.js';

export const DEFAULT_RANGE_MONTHS = 12;
export const MAX_RANGE_MONTHS = 60;

/** `from` e `to` em `AAAA-MM`, já convertidos para o dia 1 pelo `monthSchema`. */
export const monthRangeQuerySchema = z.object({
  from: monthSchema.optional(),
  to: monthSchema.optional(),
});

export type MonthRangeQuery = z.infer<typeof monthRangeQuerySchema>;

export interface MonthRange {
  /** Dia 1 do primeiro mês. */
  readonly from: string;
  /** Dia 1 do último mês, nunca depois do mês atual. */
  readonly to: string;
}

/**
 * Resolve o intervalo de meses de uma consulta: sem `to`, o mês atual (e `to` no futuro vira o mês
 * atual); sem `from`, os 12 meses que terminam em `to`. Lança `ValidationError` se `from` vier
 * depois de `to` ou se o intervalo passar de 60 meses.
 */
export function parseMonthRange(query: MonthRangeQuery, today: string): MonthRange {
  const currentMonth = firstDayOfMonth(today);
  const requestedTo = query.to ?? currentMonth;
  const to = requestedTo > currentMonth ? currentMonth : requestedTo;
  const from = query.from ?? monthsEndingAt(to, DEFAULT_RANGE_MONTHS)[0] ?? to;
  if (from > to) {
    throw new ValidationError(
      `O mês inicial ${from.slice(0, 7)} vem depois do mês final ${to.slice(0, 7)}`,
      { details: [{ field: 'from', message: 'Deve ser igual ou anterior a "to"' }] },
    );
  }
  const monthsCount = countMonthsBetween(from, to);
  if (monthsCount > MAX_RANGE_MONTHS) {
    throw new ValidationError(
      `O intervalo de ${monthsCount} meses passa do máximo de ${MAX_RANGE_MONTHS}`,
      { details: [{ field: 'from', message: `Use no máximo ${MAX_RANGE_MONTHS} meses` }] },
    );
  }
  return { from, to };
}
