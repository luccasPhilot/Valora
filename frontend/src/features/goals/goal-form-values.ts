import type { Goal, GoalInput, GoalLinkRef, NewGoalInput } from '@/lib/api/goals';
import { centsToDigits, digitsToCents } from '@/lib/money-digits';

export const MAX_GOAL_NAME_LENGTH = 80;
export const MAX_GOAL_LINKS = 10;
const DEFAULT_ICON = 'piggy-bank';

export type GoalFormField = 'name' | 'target' | 'links';
export type GoalFieldErrors = Partial<Record<GoalFormField, string>>;

/** "Eu informo": o valor vem dos aportes. "Vinculada": o valor acompanha o saldo de contas e investimentos. */
export type GoalMode = 'manual' | 'linked';

/** O que o formulário guarda enquanto você digita. Os valores ficam só em dígitos (veja `MoneyInput`). */
export interface GoalFormValues {
  readonly name: string;
  readonly icon: string;
  readonly targetDigits: string;
  /** AAAA-MM-DD, ou '' sem prazo. */
  readonly targetDate: string;
  /** Só na criação: o que você já tinha guardado. */
  readonly initialDigits: string;
  readonly mode: GoalMode;
  /** Os itens escolhidos; só valem no modo "Vinculada". */
  readonly links: readonly GoalLinkRef[];
}

export const GOAL_MESSAGES = {
  name: 'Informe o nome da meta',
  target: 'Informe um valor desejado maior que zero',
  links: 'Escolha ao menos um item para vincular',
} as const;

export function newGoalValues(): GoalFormValues {
  return {
    name: '',
    icon: DEFAULT_ICON,
    targetDigits: '',
    targetDate: '',
    initialDigits: '',
    mode: 'manual',
    links: [],
  };
}

export function goalValuesFrom(goal: Goal): GoalFormValues {
  return {
    name: goal.name,
    icon: goal.icon,
    targetDigits: centsToDigits(goal.targetCents),
    targetDate: goal.targetDate ?? '',
    initialDigits: '',
    mode: goal.isLinked ? 'linked' : 'manual',
    // Item de banco arquivado não pode ser vinculado de novo: sai da seleção ao editar.
    links: goal.links
      .filter((link) => !link.isArchived)
      .map(({ type, id }): GoalLinkRef => ({ type, id })),
  };
}

export function validateGoalValues(values: GoalFormValues): GoalFieldErrors {
  const errors: GoalFieldErrors = {};
  if (values.name.trim() === '') errors.name = GOAL_MESSAGES.name;
  if (digitsToCents(values.targetDigits) <= 0) errors.target = GOAL_MESSAGES.target;
  if (values.mode === 'linked' && values.links.length === 0) errors.links = GOAL_MESSAGES.links;
  return errors;
}

export function toGoalInput(values: GoalFormValues): GoalInput {
  return {
    name: values.name.trim(),
    icon: values.icon,
    targetCents: digitsToCents(values.targetDigits),
    targetDate: values.targetDate === '' ? null : values.targetDate,
    links: values.mode === 'linked' ? values.links : [],
  };
}

export function toNewGoalInput(values: GoalFormValues): NewGoalInput {
  const initialCents = values.mode === 'linked' ? 0 : digitsToCents(values.initialDigits);
  return { ...toGoalInput(values), initialCents };
}
