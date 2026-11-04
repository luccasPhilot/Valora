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
