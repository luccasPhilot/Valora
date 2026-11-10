import { todayInSaoPaulo, toSaoPauloDate } from './dates';
import { APP_TIMEZONE } from './timezone';

const LOCALE = 'pt-BR';
const CENTS_PER_REAL = 100;
const MINUS_SIGN = '−';
const NON_BREAKING_SPACES = new RegExp('[\u00A0\u202F]', 'g');
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const currencyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' });
const wholeCurrencyFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const compactCurrencyFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });

const fullDateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  month: 'long',
  year: 'numeric',
});
const shortMonthFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  month: 'short',
});
const dayHeaderFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayMonthFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// O Intl usa espaços especiais (NBSP) e hífen; o app usa espaço comum e o sinal tipográfico.
function normalize(text: string): string {
  return text.replace(NON_BREAKING_SPACES, ' ').replace('-', MINUS_SIGN);
}

function assertCents(cents: number): void {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Valor em centavos deve ser inteiro, recebido: ${cents}`);
  }
}

function assertIsoDate(isoDate: string): void {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new RangeError(`Data inválida, esperado AAAA-MM-DD: ${isoDate}`);
  }
}

// Meio-dia UTC cai no mesmo dia em São Paulo (UTC-3), então a data não escorrega.
function isoDateToInstant(isoDate: string): Date {
  assertIsoDate(isoDate);
  return new Date(`${isoDate}T12:00:00Z`);
}

function previousDay(isoDate: string): string {
  const instant = isoDateToInstant(isoDate);
  instant.setUTCDate(instant.getUTCDate() - 1);
  return instant.toISOString().slice(0, 10);
}

export function formatCurrency(cents: number): string {
  assertCents(cents);
  return normalize(currencyFormat.format(cents / CENTS_PER_REAL));
}

/** "R$ 410" quando o valor é redondo (sem centavos); com os centavos quando não é. */
export function formatCurrencyTrimmed(cents: number): string {
  assertCents(cents);
  if (cents % CENTS_PER_REAL !== 0) return formatCurrency(cents);
  return normalize(wholeCurrencyFormat.format(cents / CENTS_PER_REAL));
}

export function formatSignedCurrency(cents: number): string {
  assertCents(cents);
  if (cents === 0) return formatCurrency(0);
  const sign = cents > 0 ? '+' : MINUS_SIGN;
  return `${sign} ${formatCurrency(Math.abs(cents))}`;
}

export function formatCompactCurrency(cents: number): string {
  assertCents(cents);
  return normalize(compactCurrencyFormat.format(cents / CENTS_PER_REAL));
}

export function formatPercent(ratio: number): string {
  return normalize(percentFormat.format(ratio));
}

export function formatDate(isoDate: string): string {
  return fullDateFormat.format(isoDateToInstant(isoDate));
}

export function formatMonth(isoDate: string): string {
  return monthFormat.format(isoDateToInstant(isoDate));
}

/** Nome abreviado do mês de um `AAAA-MM`, como "jun.": cabe nos rótulos do eixo dos gráficos. */
export function formatMonthName(month: string): string {
  return shortMonthFormat.format(isoDateToInstant(`${month}-01`));
}

export function formatDayHeader(isoDate: string, now: Date = new Date()): string {
  assertIsoDate(isoDate);
  const today = todayInSaoPaulo(now);
  if (isoDate === today) return 'Hoje';
  if (isoDate === previousDay(today)) return 'Ontem';
  return dayHeaderFormat.format(isoDateToInstant(isoDate));
}

/** Dia e mês de um instante, como "01/11". */
export function formatDayMonth(instant: Date): string {
  return dayMonthFormat.format(instant);
}

/** Dia, mês e hora de um instante, como "05/11 às 08:12" (fuso de São Paulo). */
export function formatDayMonthAtTime(instant: Date): string {
  return `${dayMonthFormat.format(instant)} às ${timeFormat.format(instant)}`;
}

/** Dia e mês de uma data AAAA-MM-DD, como "10/11". */
export function formatIsoDayMonth(isoDate: string): string {
  return dayMonthFormat.format(isoDateToInstant(isoDate));
}

/** Quando algo aconteceu: "hoje, 07:02", "ontem, 07:01" ou "01/11, 07:01". */
export function formatMoment(instant: Date, now: Date = new Date()): string {
  const day = toSaoPauloDate(instant);
  const today = todayInSaoPaulo(now);
  const time = timeFormat.format(instant);
  if (day === today) return `hoje, ${time}`;
  if (day === previousDay(today)) return `ontem, ${time}`;
  return `${formatDayMonth(instant)}, ${time}`;
}
