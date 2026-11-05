import type { CategoriesRepository } from './categories.repository.js';
import type { Categorizer } from './categorizer.js';
import type { PluggyCategoryMappingsRepository } from './pluggy-category-mappings.repository.js';
import { DEFAULT_CATEGORIES } from './seed/default-categories.js';
import { INITIAL_PLUGGY_MAPPINGS } from './seed/pluggy-category-map.js';

export interface CategorySeedResult {
  readonly categoriesCreated: number;
  readonly transactionsRecategorized: number;
}

export interface CategorySeedDependencies {
  readonly categories: CategoriesRepository;
  readonly mappings: PluggyCategoryMappingsRepository;
  readonly categorizer: Categorizer;
}

/** Roda a cada subida da API, depois das migrations. Pode rodar quantas vezes quiser. */
export class CategorySeedService {
  constructor(private readonly deps: CategorySeedDependencies) {}

  /**
   * Cria as categorias padrão que faltam (pela `seed_key`) e, só para as criadas agora, o mapeamento
   * inicial do Pluggy. Assim um mapeamento que você limpou não volta no próximo reinício. Se algo foi
   * criado, recategoriza as transações já sincronizadas (primeira subida desta funcionalidade).
   */
  async run(): Promise<CategorySeedResult> {
    const created = await this.deps.categories.insertMissingDefaults(DEFAULT_CATEGORIES);
    if (created.length === 0) return { categoriesCreated: 0, transactionsRecategorized: 0 };
    const categoryIdBySeedKey = new Map(created.map((category) => [category.seedKey, category.id]));
    await this.deps.mappings.insertMissing(
      INITIAL_PLUGGY_MAPPINGS.flatMap(({ pluggyCategory, categorySeedKey }) => {
        const categoryId = categoryIdBySeedKey.get(categorySeedKey);
        return categoryId ? [{ pluggyCategory, categoryId }] : [];
      }),
    );
    const { changed } = await this.deps.categorizer.recategorizeAll();
    return { categoriesCreated: created.length, transactionsRecategorized: changed };
  }
}
