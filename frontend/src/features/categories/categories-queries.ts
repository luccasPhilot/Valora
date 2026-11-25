import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import {
  archiveCategory,
  type Category,
  type CategoryInput,
  type CategoryRuleInput,
  createCategory,
  createCategoryRule,
  deleteCategoryRule,
  dismissRuleSuggestion,
  listCategories,
  listCategoryRules,
  listPluggyMappings,
  listRuleSuggestions,
  ruleFromSuggestion,
  type RuleSuggestion,
  setPluggyMapping,
  updateCategory,
  updateCategoryRule,
} from '@/lib/api/categories';
import { queryKeys } from '@/lib/query-keys';

/** Todas as categorias, arquivadas inclusive: regras antigas ainda precisam do nome. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => listCategories({ includeArchived: true }),
  });
}

export function useCategoryRules() {
  return useQuery({ queryKey: queryKeys.categoryRules, queryFn: listCategoryRules });
}

export function usePluggyMappings() {
  return useQuery({ queryKey: queryKeys.pluggyMappings, queryFn: listPluggyMappings });
}

export interface CategorySave {
  readonly categoryId: string | null;
  readonly input: CategoryInput;
}

export function useSaveCategory() {
  return useMutation({
    mutationFn: ({ categoryId, input }: CategorySave) =>
      categoryId === null ? createCategory(input) : updateCategory(categoryId, input),
    onSuccess: useInvalidateAfter('categories'),
  });
}

export function useArchiveCategory() {
  return useMutation({
    mutationFn: (category: Category) => archiveCategory(category.id),
    onSuccess: useInvalidateAfter('categories'),
  });
}

export interface RuleSave {
  readonly ruleId: string | null;
  readonly input: CategoryRuleInput;
}

export function useSaveRule() {
  return useMutation({
    mutationFn: ({ ruleId, input }: RuleSave) =>
      ruleId === null ? createCategoryRule(input) : updateCategoryRule(ruleId, input),
    onSuccess: useInvalidateAfter('categorization'),
  });
}

export function useDeleteRule() {
  return useMutation({
    mutationFn: deleteCategoryRule,
    onSuccess: useInvalidateAfter('categorization'),
  });
}

export function useRuleSuggestions() {
  return useQuery({ queryKey: queryKeys.ruleSuggestions, queryFn: listRuleSuggestions });
}

/** Aceitar cria a regra `equals` pelo caminho de sempre, que recategoriza o histórico. */
export function useAcceptRuleSuggestion() {
  return useMutation({
    mutationFn: (suggestion: RuleSuggestion) => createCategoryRule(ruleFromSuggestion(suggestion)),
    onSuccess: useInvalidateAfter('categorization'),
  });
}

export function useDismissRuleSuggestion() {
  return useMutation({
    mutationFn: dismissRuleSuggestion,
    onSuccess: useInvalidateAfter('rule-suggestions'),
  });
}

export interface PluggyMappingSave {
  readonly pluggyCategory: string;
  readonly categoryId: string | null;
}

export function useSetPluggyMapping() {
  return useMutation({
    mutationFn: ({ pluggyCategory, categoryId }: PluggyMappingSave) =>
      setPluggyMapping(pluggyCategory, categoryId),
    onSuccess: useInvalidateAfter('categorization'),
  });
}
