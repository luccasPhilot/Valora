import { firstDayOfPreviousMonth } from './dates.js';

const MONTHS_PER_YEAR = 12;

function monthIndex(firstDay: string): number {
  return Number(firstDay.slice(0, 4)) * MONTHS_PER_YEAR + Number(firstDay.slice(5, 7)) - 1;
}

/** Quantos meses o intervalo tem, contando o primeiro e o último (dia 1 de cada um). */
export function countMonthsBetween(from: string, to: string): number {
  return monthIndex(to) - monthIndex(from) + 1;
}

/** Os `count` meses (dia 1) que terminam em `month`, do mais antigo ao mais recente. */
export function monthsEndingAt(month: string, count: number): string[] {
  const months = [month];
  while (months.length < count) {
    months.unshift(firstDayOfPreviousMonth(months[0] ?? month));
  }
  return months;
}

/** Os meses (dia 1) de `from` a `to`, inclusive, do mais antigo ao mais recente. */
export function monthsBetween(from: string, to: string): string[] {
  return monthsEndingAt(to, countMonthsBetween(from, to));
}
