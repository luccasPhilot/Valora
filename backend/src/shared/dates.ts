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

export function firstDayOfMonth(isoDate: string = todayInSaoPaulo()): string {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new RangeError(`Data inválida, esperado AAAA-MM-DD: ${isoDate}`);
  }
  return `${isoDate.slice(0, 7)}-01`;
}
