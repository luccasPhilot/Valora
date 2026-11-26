import { ApiError } from '@/lib/api-client';
import { normalizeSearchText } from '@/lib/text';

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  TAG_ALREADY_EXISTS: 'Já existe uma etiqueta com este nome.',
  VALIDATION_ERROR: 'Confira o nome e tente de novo.',
  NOT_FOUND: 'Esta etiqueta não existe mais. Atualize a tela e tente de novo.',
  NETWORK_ERROR: 'Sem conexão com o servidor. Tente de novo em instantes.',
};

const GENERIC_ERROR_MESSAGE = 'Não foi possível salvar. Tente de novo.';

/** Texto simples para a tela: o código da API vira uma frase, sem detalhe técnico. */
export function describeTagError(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}

/** "viagem" e "Viagem" são a mesma etiqueta, como na API (sem maiúsculas nem acento). */
export function isSameTagName(first: string, second: string): boolean {
  return normalizeSearchText(first) === normalizeSearchText(second);
}

/** Quantas transações perdem a etiqueta ao excluir, em frase: "1 transação" ou "8 transações". */
export function describeTransactionCount(count: number): string {
  return count === 1 ? '1 transação' : `${count} transações`;
}
