import { APP_TIMEZONE } from './timezone.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 'en-CA' formata como AAAA-MM-DD, o formato das colunas `date` do banco.
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

function assertIsoDate(isoDate: string): void {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new RangeError(`Data inválida, esperado AAAA-MM-DD: ${isoDate}`);
  }
}

export function firstDayOfMonth(isoDate: string = todayInSaoPaulo()): string {
  assertIsoDate(isoDate);
  return `${isoDate.slice(0, 7)}-01`;
}

// Conta em dias de calendário sobre a data pura (meia-noite UTC), sem efeito de fuso ou horário de verão.
export function subtractDays(isoDate: string, days: number): string {
  assertIsoDate(isoDate);
  const instant = new Date(`${isoDate}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() - days);
  return instant.toISOString().slice(0, 10);
}

/** Dia 1 do mês anterior ao de `isoDate`. */
export function firstDayOfPreviousMonth(isoDate: string): string {
  assertIsoDate(isoDate);
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  // Mês 0 do JavaScript é janeiro, então `month - 2` é o mês anterior; o Date acerta a virada de ano.
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return previous.toISOString().slice(0, 10);
}

export function lastDayOfMonth(isoDate: string = todayInSaoPaulo()): string {
  assertIsoDate(isoDate);
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  // Dia 0 do mês seguinte é o último dia deste mês.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

// Monta AAAA-MM-DD no mês pedido; em mês mais curto, o dia cai no último dia (dia 31 em fevereiro → 28).
function dateInMonth(year: number, monthIndex: number, dayOfMonth: number): string {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** Soma `months` meses mantendo o dia do mês; em mês mais curto, cai no último dia (31/01 + 1 → 28/02). */
export function addMonthsKeepingDay(isoDate: string, months: number): string {
  assertIsoDate(isoDate);
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const dayOfMonth = Number(isoDate.slice(8, 10));
  return dateInMonth(year, monthIndex + months, dayOfMonth);
}

/** Primeira data de hoje em diante (inclusive) que cai no mesmo dia do mês de `referenceDate`. */
export function nextOccurrenceOfDay(referenceDate: string, from: string): string {
  assertIsoDate(referenceDate);
  assertIsoDate(from);
  const dayOfMonth = Number(referenceDate.slice(8, 10));
  const year = Number(from.slice(0, 4));
  const monthIndex = Number(from.slice(5, 7)) - 1;
  const thisMonth = dateInMonth(year, monthIndex, dayOfMonth);
  return thisMonth >= from ? thisMonth : dateInMonth(year, monthIndex + 1, dayOfMonth);
}
