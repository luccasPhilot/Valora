import type { CategoryKind, MatchType } from '@/lib/api/categories';
import { ApiError } from '@/lib/api-client';

export const KIND_LABELS: Readonly<Record<CategoryKind, string>> = {
  expense: 'Despesas',
  income: 'Receitas',
  transfer: 'Transferências',
};

export const KIND_OPTION_LABELS: Readonly<Record<CategoryKind, string>> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
};

export const KIND_ORDER: readonly CategoryKind[] = ['expense', 'income', 'transfer'];

export const MATCH_TYPE_LABELS: Readonly<Record<MatchType, string>> = {
  contains: 'Contém',
  starts_with: 'Começa com',
  equals: 'É igual a',
};

export const MATCH_TYPE_ORDER: readonly MatchType[] = ['contains', 'starts_with', 'equals'];

export function parseMatchType(value: string): MatchType | undefined {
  return MATCH_TYPE_ORDER.find((matchType) => matchType === value);
}

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  CATEGORY_NAME_TAKEN: 'Já existe uma categoria com este nome.',
  CATEGORY_IN_USE: 'Esta categoria já tem transações e não pode mudar de tipo.',
  VALIDATION_ERROR: 'Confira os campos e tente de novo.',
  NOT_FOUND: 'Este item não existe mais. Atualize a tela e tente de novo.',
  NETWORK_ERROR: 'Sem conexão com o servidor. Tente de novo em instantes.',
};

const GENERIC_ERROR_MESSAGE = 'Não foi possível salvar. Tente de novo.';

/** Texto simples para a tela: o código da API vira uma frase, sem detalhe técnico. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}
