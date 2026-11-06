import { ValidationError } from '../../shared/errors.js';
import type { CategoriesRepository } from './categories.repository.js';

export type MoneyDirection = 'expense' | 'income';

const CATEGORY_KIND_MESSAGES: Readonly<Record<MoneyDirection, string>> = {
  expense: 'Escolha uma categoria de despesa',
  income: 'Escolha uma categoria de receita',
};

/**
 * A categoria precisa ser do mesmo tipo do dinheiro: despesa pede `expense`, receita pede `income`.
 * Categoria `transfer` nunca serve. Usada pelo lançamento manual e pelas previsões.
 */
export async function assertCategoryMatchesType(
  categories: CategoriesRepository,
  categoryId: string,
  type: MoneyDirection,
): Promise<void> {
  const category = await categories.findById(categoryId);
  if (category?.kind === type) return;
  throw new ValidationError(`A categoria ${categoryId} não é de ${type}`, {
    details: [{ field: 'categoryId', message: CATEGORY_KIND_MESSAGES[type] }],
  });
}

/** Uma categoria só pode ser escolhida para regras e mapeamentos se existe e não está arquivada. */
export async function assertCategoryIsSelectable(
  categories: CategoriesRepository,
  categoryId: string,
): Promise<void> {
  const category = await categories.findById(categoryId);
  if (!category) {
    throw new ValidationError(`Categoria ${categoryId} não existe`, {
      details: [{ field: 'categoryId', message: 'A categoria não existe' }],
    });
  }
  if (category.isArchived) {
    throw new ValidationError(`A categoria "${category.name}" está arquivada`, {
      details: [{ field: 'categoryId', message: 'A categoria está arquivada' }],
    });
  }
}
