import { z } from 'zod';

import type { AccountOption, Transaction, TransactionInput } from '@/lib/api/transactions';
import { subtractDays } from '@/lib/dates';
import { centsToDigits, digitsToCents } from '@/lib/money-digits';

const MAX_DESCRIPTION_LENGTH = 120;

export type TransactionKind = TransactionInput['type'];
export type DateChoice = 'today' | 'yesterday' | 'custom';
export type FormField = 'amount' | 'description' | 'category' | 'account' | 'date';
export type FieldErrors = Partial<Record<FormField, string>>;

/** O que o formulário guarda enquanto você digita. O valor fica só em dígitos (veja `MoneyInput`). */
export interface TransactionFormValues {
  readonly type: TransactionKind;
  readonly amountDigits: string;
  readonly description: string;
  readonly categoryId: string;
  readonly accountId: string;
  readonly dateChoice: DateChoice;
  /** Só vale com `dateChoice = 'custom'`. */
  readonly customDate: string;
}

/** O que o painel devolve ao formulário depois de tentar salvar. */
export type SubmitOutcome =
  | { readonly isSaved: true }
  | {
      readonly isSaved: false;
      readonly fieldErrors: FieldErrors;
      /** Frase para o aviso geral quando o erro não é de um campo. */
      readonly message: string | null;
    };

export type FormValidation =
  | { readonly isValid: true; readonly input: TransactionInput }
  | { readonly isValid: false; readonly errors: FieldErrors };

// Mensagens em linguagem simples, mostradas embaixo de cada campo.
const MESSAGES = {
  amount: 'Informe o valor',
  description: 'Informe uma descrição',
  descriptionTooLong: 'A descrição aceita até 120 caracteres',
  category: 'Escolha uma categoria',
  account: 'Escolha uma conta',
  date: 'Informe a data',
  futureDate: 'A data não pode ser no futuro',
} as const;

const FIELD_BY_ISSUE_PATH: Readonly<Record<string, FormField>> = {
  amountCents: 'amount',
  description: 'description',
  categoryId: 'category',
  accountId: 'account',
  date: 'date',
};

const inputSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountCents: z.int().min(1, { error: MESSAGES.amount }),
  description: z
    .string()
    .trim()
    .min(1, { error: MESSAGES.description })
    .max(MAX_DESCRIPTION_LENGTH, { error: MESSAGES.descriptionTooLong }),
  categoryId: z.string().min(1, { error: MESSAGES.category }),
  accountId: z.string().min(1, { error: MESSAGES.account }),
  date: z.iso.date({ error: MESSAGES.date }),
});

export function resolveFormDate(values: TransactionFormValues, today: string): string {
  switch (values.dateChoice) {
    case 'today':
      return today;
    case 'yesterday':
      return subtractDays(today, 1);
    case 'custom':
      return values.customDate;
  }
}

function collectIssues(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = FIELD_BY_ISSUE_PATH[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function validateTransactionForm(
  values: TransactionFormValues,
  today: string,
): FormValidation {
  const result = inputSchema.safeParse({
    type: values.type,
    amountCents: digitsToCents(values.amountDigits),
    description: values.description,
    categoryId: values.categoryId,
    accountId: values.accountId,
    date: resolveFormDate(values, today),
  });
  if (!result.success) return { isValid: false, errors: collectIssues(result.error) };
  if (result.data.date > today) return { isValid: false, errors: { date: MESSAGES.futureDate } };
  return { isValid: true, input: result.data };
}

const apiDetailSchema = z.object({ field: z.string(), message: z.string() });

/** Erros de campo devolvidos pela API (`details`), já em português, no formato do formulário. */
export function fieldErrorsFromApi(details: readonly unknown[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const detail of details) {
    const parsed = apiDetailSchema.safeParse(detail);
    const field = parsed.success ? FIELD_BY_ISSUE_PATH[parsed.data.field] : undefined;
    if (parsed.success && field && !errors[field]) errors[field] = parsed.data.message;
  }
  return errors;
}

function pickDateChoice(date: string, today: string): DateChoice {
  if (date === today) return 'today';
  return date === subtractDays(today, 1) ? 'yesterday' : 'custom';
}

interface NewValuesRequest {
  readonly type: TransactionKind;
  readonly accounts: readonly AccountOption[];
}

/** "Dinheiro" vem escolhida; sem ela (ainda não criada), a primeira conta da lista. */
export function pickDefaultAccountId(accounts: readonly AccountOption[]): string {
  return (accounts.find((account) => account.type === 'cash') ?? accounts[0])?.id ?? '';
}

export function newTransactionValues({ type, accounts }: NewValuesRequest): TransactionFormValues {
  return {
    type,
    amountDigits: '',
    description: '',
    categoryId: '',
    accountId: pickDefaultAccountId(accounts),
    dateChoice: 'today',
    customDate: '',
  };
}

export function editTransactionValues(
  transaction: Transaction,
  today: string,
): TransactionFormValues {
  return {
    type: transaction.amountCents < 0 ? 'expense' : 'income',
    amountDigits: centsToDigits(Math.abs(transaction.amountCents)),
    description: transaction.description,
    categoryId: transaction.category?.id ?? '',
    accountId: transaction.account.id,
    dateChoice: pickDateChoice(transaction.date, today),
    customDate: transaction.date,
  };
}
