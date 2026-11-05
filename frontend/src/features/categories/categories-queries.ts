import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveCategory,
  type Category,
  type CategoryInput,
  type CategoryRuleInput,
  createCategory,
  createCategoryRule,
  deleteCategoryRule,
  listCategories,
  listCategoryRules,
  listPluggyMappings,
  setPluggyMapping,
  updateCategory,
  updateCategoryRule,
} from '@/lib/api/categories';

const CATEGORIES_KEY = ['categories'] as const;
const RULES_KEY = ['category-rules'] as const;
const PLUGGY_MAPPINGS_KEY = ['pluggy-category-mappings'] as const;

/** Todas as categorias, arquivadas inclusive: regras antigas ainda precisam do nome. */
export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => listCategories({ includeArchived: true }),
  });
}

export function useCategoryRules() {
  return useQuery({ queryKey: RULES_KEY, queryFn: listCategoryRules });
}

export function usePluggyMappings() {
  return useQuery({ queryKey: PLUGGY_MAPPINGS_KEY, queryFn: listPluggyMappings });
}

// Mudar regra ou mapeamento recategoriza transações no servidor; quando a tela de transações existir,
// a lista dela entra nas chaves invalidadas aqui.
function useInvalidate() {
  const queryClient = useQueryClient();
  return (queryKey: readonly string[]) => queryClient.invalidateQueries({ queryKey });
}

export interface CategorySave {
  readonly categoryId: string | null;
  readonly input: CategoryInput;
}

export function useSaveCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ categoryId, input }: CategorySave) =>
      categoryId === null ? createCategory(input) : updateCategory(categoryId, input),
    onSuccess: () => invalidate(CATEGORIES_KEY),
  });
}

export function useArchiveCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (category: Category) => archiveCategory(category.id),
    onSuccess: () => invalidate(CATEGORIES_KEY),
  });
}

export interface RuleSave {
  readonly ruleId: string | null;
  readonly input: CategoryRuleInput;
}

export function useSaveRule() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ ruleId, input }: RuleSave) =>
      ruleId === null ? createCategoryRule(input) : updateCategoryRule(ruleId, input),
    onSuccess: () => invalidate(RULES_KEY),
  });
}

export function useDeleteRule() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: deleteCategoryRule,
    onSuccess: () => invalidate(RULES_KEY),
  });
}

export interface PluggyMappingSave {
  readonly pluggyCategory: string;
  readonly categoryId: string | null;
}

export function useSetPluggyMapping() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ pluggyCategory, categoryId }: PluggyMappingSave) =>
      setPluggyMapping(pluggyCategory, categoryId),
    onSuccess: () => invalidate(PLUGGY_MAPPINGS_KEY),
  });
}
