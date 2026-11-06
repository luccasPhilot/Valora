import { todayInSaoPaulo } from '../../shared/dates.js';
import { OpenFinanceReadOnlyError, ValidationError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import type { AccountsRepository } from '../accounts/accounts.repository.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import {
  assertCategoryIsSelectable,
  assertCategoryMatchesType,
} from '../categories/category-availability.js';
import type { CategoryRulesService } from '../categories/category-rules.service.js';
import {
  buildManualChanges,
  type ManualTransactionFields,
  type ManualTransactionType,
  signedAmountCents,
  type TransactionPatch,
  typeOfAmount,
} from './manual-transaction-fields.js';
import type { TransactionRecord } from './transactions.repository.js';
import type { TransactionsService } from './transactions.service.js';
import type { TransactionsWriteRepository } from './transactions-write.repository.js';

function readOnlyError(transaction: TransactionRecord, action: string): OpenFinanceReadOnlyError {
  return new OpenFinanceReadOnlyError(
    `A transação ${transaction.id} veio do Open Finance e não pode ser ${action}`,
  );
}

export interface TransactionWritesDependencies {
  readonly reads: Pick<TransactionsService, 'get' | 'changeCategory'>;
  readonly writes: TransactionsWriteRepository;
  readonly categories: CategoriesRepository;
  readonly accounts: Pick<AccountsRepository, 'exists'>;
  readonly rules: Pick<CategoryRulesService, 'learnFromCorrection'>;
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
    return this.deps.reads.get(transactionId);
  }

  async update(transactionId: string, patch: TransactionPatch): Promise<TransactionRecord> {
    const current = await this.deps.reads.get(transactionId);
    if (current.source === 'open_finance') return this.updateOpenFinance(current, patch);
    await this.assertPatchIsAllowed(current, patch);
    await this.deps.writes.updateManual(
      transactionId,
      buildManualChanges(current.amountCents, patch),
    );
    if (patch.applyAlways && patch.categoryId) {
      await this.deps.rules.learnFromCorrection(transactionId, patch.categoryId);
    }
    return this.deps.reads.get(transactionId);
  }

  async remove(transactionId: string): Promise<void> {
    const current = await this.deps.reads.get(transactionId);
    if (current.source === 'open_finance') throw readOnlyError(current, 'excluída');
    await this.deps.writes.deleteManual(transactionId);
  }

  private updateOpenFinance(
    current: TransactionRecord,
    { categoryId, applyAlways, ...otherFields }: TransactionPatch,
  ): Promise<TransactionRecord> {
    if (Object.values(otherFields).some((value) => value !== undefined)) {
      throw readOnlyError(current, 'alterada além da categoria');
    }
    if (categoryId === undefined) {
      throw new ValidationError(`Nenhuma categoria enviada para a transação ${current.id}`, {
        details: [{ field: 'categoryId', message: 'Escolha uma categoria' }],
      });
    }
    return this.deps.reads.changeCategory(current.id, {
      categoryId,
      applyAlways: applyAlways ?? false,
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
