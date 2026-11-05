import type { CategoriesRepository } from './categories.repository.js';
import type { Categorizer } from './categorizer.js';
import { assertCategoryIsSelectable } from './category-availability.js';
import type { PluggyCategoryMappingsRepository } from './pluggy-category-mappings.repository.js';
import { PLUGGY_CATEGORIES } from './seed/pluggy-categories.js';

export interface PluggyCategoryMappingView {
  readonly pluggyCategory: string;
  readonly categoryId: string | null;
}

export interface PluggyCategoryMappingsServiceDependencies {
  readonly mappings: PluggyCategoryMappingsRepository;
  readonly categories: CategoriesRepository;
  readonly categorizer: Categorizer;
}

export class PluggyCategoryMappingsService {
  constructor(private readonly deps: PluggyCategoryMappingsServiceDependencies) {}

  /**
   * Toda categoria do Pluggy que o Valora conhece (a lista do Pluggy, as que já apareceram
   * nas transações e as que você mapeou), com a categoria escolhida ou `null`. Sem paginação: são
   * pouco mais de cem (docs/03-arquitetura.md).
   */
  async list(): Promise<PluggyCategoryMappingView[]> {
    const mappings = await this.deps.mappings.findAll();
    const categoryByPluggyCategory = new Map(
      mappings.map((mapping) => [mapping.pluggyCategory, mapping.categoryId]),
    );
    const known = new Set([
      ...PLUGGY_CATEGORIES,
      ...(await this.deps.mappings.findPluggyCategoriesInTransactions()),
      ...categoryByPluggyCategory.keys(),
    ]);
    return [...known]
      .sort((first, second) => first.localeCompare(second))
      .map((pluggyCategory) => ({
        pluggyCategory,
        categoryId: categoryByPluggyCategory.get(pluggyCategory) ?? null,
      }));
  }

  /** `categoryId` nulo limpa o mapeamento. Depois reaplica a decisão às transações do Pluggy. */
  async set(pluggyCategory: string, categoryId: string | null): Promise<PluggyCategoryMappingView> {
    if (categoryId === null) {
      await this.deps.mappings.delete(pluggyCategory);
    } else {
      await assertCategoryIsSelectable(this.deps.categories, categoryId);
      await this.deps.mappings.upsert({ pluggyCategory, categoryId });
    }
    await this.deps.categorizer.recategorizeAll();
    return { pluggyCategory, categoryId };
  }
}
