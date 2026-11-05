import { APP_TIMEZONE } from './timezone';

// 'en-CA' formata como AAAA-MM-DD, o mesmo formato que a API usa para datas.
const saoPauloDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toSaoPauloDate(instant: Date): string {
  return saoPauloDateFormat.format(instant);
}

export function todayInSaoPaulo(now: Date = new Date()): string {
  return toSaoPauloDate(now);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function monthStart(isoDate: string, monthOffset: number): Date {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new RangeError(`Data inválida, esperado AAAA-MM-DD: ${isoDate}`);
  }
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1));
}

/** Primeiro dia do mês de `isoDate`, deslocado `monthOffset` meses (negativo = para trás). */
export function firstDayOfMonth(isoDate: string, monthOffset = 0): string {
  return monthStart(isoDate, monthOffset).toISOString().slice(0, 10);
}

/** Último dia do mês de `isoDate`, deslocado `monthOffset` meses (negativo = para trás). */
export function lastDayOfMonth(isoDate: string, monthOffset = 0): string {
  // Dia 0 do mês seguinte é o último dia deste mês.
  return new Date(monthStart(isoDate, monthOffset + 1).getTime() - 1).toISOString().slice(0, 10);
}
