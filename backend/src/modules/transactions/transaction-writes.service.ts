import { todayInSaoPaulo } from '../../shared/dates.js';
import { OpenFinanceReadOnlyError, ValidationError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { AccountsRepository } from '../accounts/accounts.repository.js';
import type { BudgetAlertRefresher } from '../alerts/budget-alert-refresher.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import {
  assertCategoryIsSelectable,
  assertCategoryMatchesType,
} from '../categories/category-availability.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import type { RuleSuggestion } from '../categories/rule-suggestions.js';
import type { RuleSuggestionsService } from '../categories/rule-suggestions.service.js';
import type { TagsRepository } from '../tags/tags.repository.js';
import {
  buildManualChanges,
  type ManualTransactionFields,
  type ManualTransactionType,
  signedAmountCents,
  type TransactionPatch,
  typeOfAmount,
} from './manual-transaction-fields.js';
import type {
  AnnotationChanges,
  NoteValue,
  TransactionAnnotationsRepository,
} from './transaction-annotations.repository.js';
import type { TransactionRecord } from './transactions.repository.js';
import type { TransactionsService } from './transactions.service.js';
import type { TransactionsWriteRepository } from './transactions-write.repository.js';

function readOnlyError(transaction: TransactionRecord, action: string): OpenFinanceReadOnlyError {
  return new OpenFinanceReadOnlyError(
    `A transação ${transaction.id} veio do Open Finance e não pode ser ${action}`,
  );
}

function toNoteValue(note: string | null): NoteValue {
  const trimmed = note?.trim() ?? '';
  if (trimmed === '') return { note: null, noteNormalized: null };
  return { note: trimmed, noteNormalized: normalizeDescription(trimmed) };
}

export interface TransactionUpdate {
  readonly transaction: TransactionRecord;
  /** Depois de uma troca de categoria: a regra sugerida para a descrição, ou nula. */
  readonly ruleSuggestion: RuleSuggestion | null;
}

export interface TransactionWritesDependencies {
  readonly reads: Pick<TransactionsService, 'get' | 'changeCategory'>;
  readonly writes: TransactionsWriteRepository;
  readonly annotations: TransactionAnnotationsRepository;
  readonly tags: Pick<TagsRepository, 'findExistingIds'>;
  readonly categories: CategoriesRepository;
  readonly accounts: Pick<AccountsRepository, 'exists'>;
  readonly rules: Pick<CategoryRulesService, 'learnFromCorrection'>;
  readonly suggestions: Pick<RuleSuggestionsService, 'suggestionFor'>;
  readonly budgetAlerts: Pick<BudgetAlertRefresher, 'refresh'>;
  readonly now: () => Date;
}

/**
 * Lançar, editar e excluir transações. As do Open Finance são só leitura (só a categoria muda):
 * a regra de origem mora aqui, não na rota.
 */
export class TransactionWritesService {
  constructor(private readonly deps: TransactionWritesDependencies) {}

  async create(fields: ManualTransactionFields): Promise<TransactionRecord> {
    await this.assertFieldsAreAllowed(fields, fields.type);
    const transactionId = await this.deps.writes.insertManual({
      accountId: fields.accountId,
      categoryId: fields.categoryId,
      date: fields.date,
      description: fields.description,
      descriptionNormalized: normalizeDescription(fields.description),
      amountCents: signedAmountCents(fields.type, fields.amountCents),
    });
    await this.deps.budgetAlerts.refresh();
    return this.deps.reads.get(transactionId);
  }

  async update(transactionId: string, patch: TransactionPatch): Promise<TransactionUpdate> {
    const transaction = await this.applyUpdate(transactionId, patch);
    const ruleSuggestion = patch.categoryId
      ? await this.deps.suggestions.suggestionFor([transactionId], patch.categoryId)
      : null;
    return { transaction, ruleSuggestion };
  }

  async remove(transactionId: string): Promise<void> {
    const current = await this.deps.reads.get(transactionId);
    if (current.source === 'open_finance') throw readOnlyError(current, 'excluída');
    await this.deps.writes.deleteManual(transactionId);
    await this.deps.budgetAlerts.refresh();
  }

  private async applyUpdate(
    transactionId: string,
    patch: TransactionPatch,
  ): Promise<TransactionRecord> {
    const current = await this.deps.reads.get(transactionId);
    const annotations = await this.buildAnnotations(patch);
    if (current.source === 'open_finance') {
      await this.updateOpenFinance(current, patch);
    } else {
      await this.updateManual(current, patch);
    }
    await this.deps.annotations.apply(transactionId, annotations);
    return this.deps.reads.get(transactionId);
  }

  private async updateManual(current: TransactionRecord, patch: TransactionPatch): Promise<void> {
    await this.assertPatchIsAllowed(current, patch);
    await this.deps.writes.updateManual(current.id, buildManualChanges(current.amountCents, patch));
    if (patch.applyAlways && patch.categoryId) {
      await this.deps.rules.learnFromCorrection(current.id, patch.categoryId);
    }
    await this.deps.budgetAlerts.refresh();
  }

  /** No Open Finance só a categoria, a nota e as etiquetas mudam (decisão de 24/11/2026). */
  private async updateOpenFinance(
    current: TransactionRecord,
    { categoryId, applyAlways, note: _note, tagIds: _tagIds, ...otherFields }: TransactionPatch,
  ): Promise<void> {
    if (Object.values(otherFields).some((value) => value !== undefined)) {
      throw readOnlyError(current, 'alterada além da categoria, da nota e das etiquetas');
    }
    if (categoryId === undefined) return;
    await this.deps.reads.changeCategory(current.id, {
      categoryId,
      applyAlways: applyAlways ?? false,
    });
  }

  /** Valida as etiquetas (todas precisam existir) e normaliza a nota; nada é gravado ainda. */
  private async buildAnnotations({ note, tagIds }: TransactionPatch): Promise<AnnotationChanges> {
    if (tagIds !== undefined) await this.assertTagsExist(tagIds);
    return { note: note === undefined ? undefined : toNoteValue(note), tagIds };
  }

  private async assertTagsExist(tagIds: readonly string[]): Promise<void> {
    const existingIds = new Set(await this.deps.tags.findExistingIds(tagIds));
    const missingIds = tagIds.filter((tagId) => !existingIds.has(tagId));
    if (missingIds.length === 0) return;
    throw new ValidationError(`Etiquetas ${missingIds.join(', ')} não existem`, {
      details: [{ field: 'tagIds', message: 'Há etiqueta que não existe' }],
    });
  }

  /** Só revalida a categoria quando o tipo ou a categoria mudam: um valor corrigido não a reabre. */
  private assertPatchIsAllowed(current: TransactionRecord, patch: TransactionPatch): Promise<void> {
    const type = patch.type ?? typeOfAmount(current.amountCents);
    const isCategoryAtStake = patch.type !== undefined || patch.categoryId !== undefined;
    const categoryId = isCategoryAtStake ? (patch.categoryId ?? current.category?.id) : undefined;
    return this.assertFieldsAreAllowed({ ...patch, categoryId }, type);
  }

  /** Valida só o que veio: data, conta e a combinação categoria × tipo. */
  private async assertFieldsAreAllowed(
    fields: Partial<ManualTransactionFields>,
    type: ManualTransactionType,
  ): Promise<void> {
    if (fields.date !== undefined) this.assertDateIsNotInTheFuture(fields.date);
    if (fields.accountId !== undefined) await this.assertAccountExists(fields.accountId);
    if (fields.categoryId === undefined) return;
    await assertCategoryIsSelectable(this.deps.categories, fields.categoryId);
    await assertCategoryMatchesType(this.deps.categories, fields.categoryId, type);
  }

  private assertDateIsNotInTheFuture(date: string): void {
    if (date <= todayInSaoPaulo(this.deps.now())) return;
    throw new ValidationError(`A data ${date} está no futuro`, {
      details: [{ field: 'date', message: 'A data não pode ser no futuro' }],
    });
  }

  private async assertAccountExists(accountId: string): Promise<void> {
    if (await this.deps.accounts.exists(accountId)) return;
    throw new ValidationError(`Conta ${accountId} não existe`, {
      details: [{ field: 'accountId', message: 'A conta não existe' }],
    });
  }
}
