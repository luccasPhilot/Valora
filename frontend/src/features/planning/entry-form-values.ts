import { z } from 'zod';

import type { PlannedEntry, PlannedEntryInput, Recurrence } from '@/lib/api/planned-entries';
import { centsToDigits, digitsToCents } from '@/lib/money-digits';

const MAX_DESCRIPTION_LENGTH = 120;
const FIRST_DAY = 1;
const LAST_DAY = 31;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type EntryKind = PlannedEntryInput['type'];
export type EntryFormField =
  'amount' | 'description' | 'category' | 'day' | 'recurrence' | 'start' | 'end';
export type EntryFieldErrors = Partial<Record<EntryFormField, string>>;

/** O que o formulário guarda enquanto você digita. O valor fica só em dígitos (veja `MoneyInput`). */
export interface EntryFormValues {
  readonly type: EntryKind;
  readonly amountDigits: string;
  readonly description: string;
  readonly categoryId: string;
  /** Texto do campo; vira número na validação. */
  readonly dayOfMonth: string;
  readonly recurrence: Recurrence;
  /** `AAAA-MM`. */
  readonly startMonth: string;
  /** `AAAA-MM`, ou '' sem fim. */
  readonly endMonth: string;
}

/** O que o painel devolve ao formulário depois de tentar salvar. */
export type EntrySubmitOutcome =
  | { readonly isSaved: true }
  | {
      readonly isSaved: false;
      readonly fieldErrors: EntryFieldErrors;
      /** Frase para o aviso geral quando o erro não é de um campo. */
      readonly message: string | null;
    };

export type EntryFormValidation =
  | { readonly isValid: true; readonly input: PlannedEntryInput }
  | { readonly isValid: false; readonly errors: EntryFieldErrors };

const MESSAGES = {
  amount: 'Informe o valor',
  description: 'Informe uma descrição',
  descriptionTooLong: 'A descrição aceita até 120 caracteres',
  category: 'Escolha uma categoria',
  day: 'Informe um dia de 1 a 31',
  start: 'Informe o mês de início',
  end: 'Informe um mês válido',
  endBeforeStart: 'O mês de fim não pode ser antes do início',
} as const;

const FIELD_BY_ISSUE_PATH: Readonly<Record<string, EntryFormField>> = {
  amountCents: 'amount',
  description: 'description',
  categoryId: 'category',
  dayOfMonth: 'day',
  startMonth: 'start',
  endMonth: 'end',
};

const monthSchema = (message: string) => z.string().regex(MONTH_PATTERN, { error: message });

const inputSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountCents: z.int().min(1, { error: MESSAGES.amount }),
  description: z
    .string()
    .trim()
    .min(1, { error: MESSAGES.description })
    .max(MAX_DESCRIPTION_LENGTH, { error: MESSAGES.descriptionTooLong }),
  categoryId: z.string().min(1, { error: MESSAGES.category }),
  dayOfMonth: z
    .int({ error: MESSAGES.day })
    .min(FIRST_DAY, { error: MESSAGES.day })
    .max(LAST_DAY, { error: MESSAGES.day }),
  recurrence: z.enum(['none', 'monthly', 'yearly']),
  startMonth: monthSchema(MESSAGES.start),
  endMonth: monthSchema(MESSAGES.end).nullable(),
});

function collectIssues(error: z.ZodError): EntryFieldErrors {
  const errors: EntryFieldErrors = {};
  for (const issue of error.issues) {
    const field = FIELD_BY_ISSUE_PATH[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

// Uma previsão que não repete não tem fim: o campo some do formulário e o valor não segue junto.
function endMonthFor(values: EntryFormValues): string | null {
  if (values.recurrence === 'none' || values.endMonth === '') return null;
  return values.endMonth;
}

export function validateEntryForm(values: EntryFormValues): EntryFormValidation {
  const result = inputSchema.safeParse({
    type: values.type,
    amountCents: digitsToCents(values.amountDigits),
    description: values.description,
    categoryId: values.categoryId,
    dayOfMonth: values.dayOfMonth.trim() === '' ? Number.NaN : Number(values.dayOfMonth),
    recurrence: values.recurrence,
    startMonth: values.startMonth,
    endMonth: endMonthFor(values),
  });
  if (!result.success) return { isValid: false, errors: collectIssues(result.error) };
  const { data } = result;
  if (data.endMonth !== null && data.endMonth < data.startMonth) {
    return { isValid: false, errors: { end: MESSAGES.endBeforeStart } };
  }
  return { isValid: true, input: { ...data, isActive: true } };
}

const apiDetailSchema = z.object({ field: z.string(), message: z.string() });

/** Erros de campo devolvidos pela API (`details`), já em português, no formato do formulário. */
export function entryFieldErrorsFromApi(details: readonly unknown[]): EntryFieldErrors {
  const errors: EntryFieldErrors = {};
  for (const detail of details) {
    const parsed = apiDetailSchema.safeParse(detail);
    const field = parsed.success ? FIELD_BY_ISSUE_PATH[parsed.data.field] : undefined;
    if (parsed.success && field && !errors[field]) errors[field] = parsed.data.message;
  }
  return errors;
}

/** Formulário em branco, já no mês que a tela está mostrando. */
export function newEntryValues(month: string): EntryFormValues {
  return {
    type: 'expense',
    amountDigits: '',
    description: '',
    categoryId: '',
    dayOfMonth: '',
    recurrence: 'monthly',
    startMonth: month,
    endMonth: '',
  };
}

/** A previsão como o formulário a enviaria, com `isActive` à escolha: é como pausar e reativar a salvam. */
export function inputFromEntry(entry: PlannedEntry, isActive: boolean): PlannedEntryInput {
  return {
    description: entry.description,
    type: entry.amountCents < 0 ? 'expense' : 'income',
    amountCents: Math.abs(entry.amountCents),
    categoryId: entry.categoryId,
    dayOfMonth: entry.dayOfMonth,
    recurrence: entry.recurrence,
    startMonth: entry.startMonth,
    endMonth: entry.endMonth,
    isActive,
  };
}

export function entryValuesFrom(entry: PlannedEntry): EntryFormValues {
  return {
    type: entry.amountCents < 0 ? 'expense' : 'income',
    amountDigits: centsToDigits(Math.abs(entry.amountCents)),
    description: entry.description,
    categoryId: entry.categoryId,
    dayOfMonth: String(entry.dayOfMonth),
    recurrence: entry.recurrence,
    startMonth: entry.startMonth,
    endMonth: entry.endMonth ?? '',
  };
}
