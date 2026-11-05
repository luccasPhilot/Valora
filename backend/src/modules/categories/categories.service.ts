import { NotFoundError } from '../../shared/errors.js';
import { CategoryInUseError, CategoryNameTakenError } from './categories.errors.js';
import type {
  CategoriesRepository,
  CategoryFields,
  CategoryRecord,
} from './categories.repository.js';

export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  // Sem paginação: são dezenas de categorias (decisão em docs/03-arquitetura.md).
  list(options: { readonly includeArchived: boolean }): Promise<CategoryRecord[]> {
    return this.repository.findAll(options);
  }

  async create(fields: CategoryFields): Promise<CategoryRecord> {
    await this.assertNameAvailable(fields.name);
    return this.repository.insert(fields);
  }

  async update(categoryId: string, fields: CategoryFields): Promise<CategoryRecord> {
    const current = await this.requireCategory(categoryId);
    await this.assertNameAvailable(fields.name, categoryId);
    if (current.kind !== fields.kind) await this.assertHasNoTransactions(current);
    const updated = await this.repository.update(categoryId, fields);
    if (!updated) throw new NotFoundError(`Categoria ${categoryId} não existe`);
    return updated;
  }

  /** Arquiva: as transações antigas continuam nela, mas ela sai das opções para novas escolhas. */
  async archive(categoryId: string): Promise<CategoryRecord> {
    const archived = await this.repository.archive(categoryId);
    if (!archived) throw new NotFoundError(`Categoria ${categoryId} não existe`);
    return archived;
  }

  private async requireCategory(categoryId: string): Promise<CategoryRecord> {
    const category = await this.repository.findById(categoryId);
    if (!category) throw new NotFoundError(`Categoria ${categoryId} não existe`);
    return category;
  }

  private async assertNameAvailable(name: string, exceptCategoryId?: string): Promise<void> {
    if (await this.repository.existsWithName(name, exceptCategoryId)) {
      throw new CategoryNameTakenError(`Já existe uma categoria chamada "${name}"`, {
        details: [{ field: 'name', message: 'Já existe uma categoria com este nome' }],
      });
    }
  }

  private async assertHasNoTransactions(category: CategoryRecord): Promise<void> {
    const transactionCount = await this.repository.countTransactions(category.id);
    if (transactionCount > 0) {
      throw new CategoryInUseError(
        `A categoria "${category.name}" tem ${String(transactionCount)} transações e não pode mudar de tipo`,
        { details: [{ field: 'kind', message: 'A categoria já tem transações' }] },
      );
    }
  }
}
