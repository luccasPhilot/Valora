import { ValidationError } from '../../shared/errors.js';
import type { CategoriesRepository } from './categories.repository.js';

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
