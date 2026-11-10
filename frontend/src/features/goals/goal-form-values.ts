import type { Goal, GoalInput, NewGoalInput } from '@/lib/api/goals';
import { centsToDigits, digitsToCents } from '@/lib/money-digits';

export const MAX_GOAL_NAME_LENGTH = 80;
const DEFAULT_ICON = 'piggy-bank';

export type GoalFormField = 'name' | 'target';
export type GoalFieldErrors = Partial<Record<GoalFormField, string>>;

/** O que o formulário guarda enquanto você digita. Os valores ficam só em dígitos (veja `MoneyInput`). */
export interface GoalFormValues {
  readonly name: string;
  readonly icon: string;
  readonly targetDigits: string;
  /** AAAA-MM-DD, ou '' sem prazo. */
  readonly targetDate: string;
  /** Só na criação: o que você já tinha guardado. */
  readonly initialDigits: string;
}

export const GOAL_MESSAGES = {
  name: 'Informe o nome da meta',
  target: 'Informe um valor desejado maior que zero',
} as const;

export function newGoalValues(): GoalFormValues {
  return { name: '', icon: DEFAULT_ICON, targetDigits: '', targetDate: '', initialDigits: '' };
}

export function goalValuesFrom(goal: Goal): GoalFormValues {
  return {
    name: goal.name,
    icon: goal.icon,
    targetDigits: centsToDigits(goal.targetCents),
    targetDate: goal.targetDate ?? '',
    initialDigits: '',
  };
}

export function validateGoalValues(values: GoalFormValues): GoalFieldErrors {
  const errors: GoalFieldErrors = {};
  if (values.name.trim() === '') errors.name = GOAL_MESSAGES.name;
  if (digitsToCents(values.targetDigits) <= 0) errors.target = GOAL_MESSAGES.target;
  return errors;
}

export function toGoalInput(values: GoalFormValues): GoalInput {
  return {
    name: values.name.trim(),
    icon: values.icon,
    targetCents: digitsToCents(values.targetDigits),
    targetDate: values.targetDate === '' ? null : values.targetDate,
  };
}

export function toNewGoalInput(values: GoalFormValues): NewGoalInput {
  return { ...toGoalInput(values), initialCents: digitsToCents(values.initialDigits) };
}
