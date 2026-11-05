import type { Database, DbExecutor } from '../../db/database.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';
import { CategorizationRepository } from './categorization.repository.js';
import { Categorizer, type CategorizerRepositories } from './categorizer.js';
import { CategoryRulesRepository } from './category-rules.repository.js';
import { CategoryRulesService } from './category-rules.service.js';
import { CategorySeedService } from './category-seed.service.js';
import { PluggyCategoryMappingsRepository } from './pluggy-category-mappings.repository.js';
import { PluggyCategoryMappingsService } from './pluggy-category-mappings.service.js';

export interface CategoriesModule {
  readonly categoriesService: CategoriesService;
  readonly categoryRulesService: CategoryRulesService;
  readonly pluggyCategoryMappingsService: PluggyCategoryMappingsService;
  readonly categorySeedService: CategorySeedService;
}

/** Repositórios de categorização ligados a um executor: o `db` ou o `tx` de uma transação. */
export function createCategorizerRepositories(executor: DbExecutor): CategorizerRepositories {
  return {
    rules: new CategoryRulesRepository(executor),
    mappings: new PluggyCategoryMappingsRepository(executor),
    transactions: new CategorizationRepository(executor),
  };
}

export function createCategoriesModule({ db }: Database): CategoriesModule {
  const categories = new CategoriesRepository(db);
  const repositories = createCategorizerRepositories(db);
  const categorizer = new Categorizer(repositories);
  return {
    categoriesService: new CategoriesService(categories),
    categoryRulesService: new CategoryRulesService({
      rules: repositories.rules,
      categories,
      transactions: repositories.transactions,
      categorizer,
    }),
    pluggyCategoryMappingsService: new PluggyCategoryMappingsService({
      mappings: repositories.mappings,
      categories,
      categorizer,
    }),
    categorySeedService: new CategorySeedService({
      categories,
      mappings: repositories.mappings,
      categorizer,
    }),
  };
}
