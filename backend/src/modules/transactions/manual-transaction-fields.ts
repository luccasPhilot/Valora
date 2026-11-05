import { normalizeDescription } from '../../shared/text.js';
import type { ManualTransactionChanges } from './transactions-write.repository.js';

export type ManualTransactionType = 'income' | 'expense';

export interface ManualTransactionFields {
  readonly type: ManualTransactionType;
  /** Sempre positivo: o sinal vem do `type`. */
  readonly amountCents: number;
  readonly description: string;
  readonly date: string;
  readonly categoryId: string;
  readonly accountId: string;
}

/** Edição parcial: só o que veio no corpo muda. `applyAlways` só vale junto com a categoria. */
export type TransactionPatch = Partial<ManualTransactionFields> & {
  readonly applyAlways?: boolean;
};

/** Despesa guarda valor negativo; receita, positivo. */
export function signedAmountCents(type: ManualTransactionType, amountCents: number): number {
  return type === 'expense' ? -amountCents : amountCents;
}

export function typeOfAmount(amountCents: number): ManualTransactionType {
  return amountCents < 0 ? 'expense' : 'income';
}

/** Traduz a edição para as colunas que mudam, mantendo o valor atual quando só o tipo mudou. */
export function buildManualChanges(
  currentAmountCents: number,
  patch: TransactionPatch,
): ManualTransactionChanges {
  const changes: {
    -readonly [Key in keyof ManualTransactionChanges]: ManualTransactionChanges[Key];
  } = {};
  if (patch.accountId !== undefined) changes.accountId = patch.accountId;
  if (patch.categoryId !== undefined) changes.categoryId = patch.categoryId;
  if (patch.date !== undefined) changes.date = patch.date;
  if (patch.description !== undefined) {
    changes.description = patch.description;
    changes.descriptionNormalized = normalizeDescription(patch.description);
  }
  if (patch.amountCents !== undefined || patch.type !== undefined) {
    const type = patch.type ?? typeOfAmount(currentAmountCents);
    changes.amountCents = signedAmountCents(
      type,
      patch.amountCents ?? Math.abs(currentAmountCents),
    );
  }
  return changes;
}
