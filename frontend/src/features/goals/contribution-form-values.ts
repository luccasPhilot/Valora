import type { ContributionInput } from '@/lib/api/goals';
import { digitsToCents } from '@/lib/money-digits';

export type ContributionType = ContributionInput['type'];
export type ContributionFormField = 'amount' | 'date';
export type ContributionFieldErrors = Partial<Record<ContributionFormField, string>>;

export interface ContributionFormValues {
  readonly amountDigits: string;
  /** AAAA-MM-DD. */
  readonly date: string;
}

export const CONTRIBUTION_MESSAGES = {
  amount: 'Informe um valor maior que zero',
  withdrawalTooLarge: 'A retirada passa do valor acumulado da meta',
  date: 'Informe uma data até hoje',
} as const;

interface ContributionContext {
  readonly type: ContributionType;
  readonly savedCents: number;
  readonly today: string;
}

export function validateContribution(
  values: ContributionFormValues,
  { type, savedCents, today }: ContributionContext,
): ContributionFieldErrors {
  const errors: ContributionFieldErrors = {};
  const amountCents = digitsToCents(values.amountDigits);
  if (amountCents <= 0) errors.amount = CONTRIBUTION_MESSAGES.amount;
  else if (type === 'withdrawal' && amountCents > savedCents) {
    errors.amount = CONTRIBUTION_MESSAGES.withdrawalTooLarge;
  }
  if (values.date === '' || values.date > today) errors.date = CONTRIBUTION_MESSAGES.date;
  return errors;
}

export function toContributionInput(
  values: ContributionFormValues,
  type: ContributionType,
): ContributionInput {
  return { type, amountCents: digitsToCents(values.amountDigits), date: values.date };
}
