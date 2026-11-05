import { z } from 'zod';

import { apiDelete, apiGet, apiPost, apiPut } from '../api-client';

// Contrato de /categories, /category-rules e /pluggy-category-mappings. O backend é o dono; estes
// schemas são a cópia do front (docs/03-arquitetura.md, "Contrato da API").

const categoryKindSchema = z.enum(['expense', 'income', 'transfer']);
const matchTypeSchema = z.enum(['contains', 'starts_with', 'equals']);

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type MatchType = z.infer<typeof matchTypeSchema>;

const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: categoryKindSchema,
  icon: z.string(),
  isArchived: z.boolean(),
});
const categoryListSchema = z.object({ items: z.array(categorySchema) });

const ruleSchema = z.object({
  id: z.uuid(),
  pattern: z.string(),
  matchType: matchTypeSchema,
  categoryId: z.uuid(),
  priority: z.int(),
  learnedFromTransactionId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});
const ruleListSchema = z.object({ items: z.array(ruleSchema) });

const pluggyMappingSchema = z.object({
  pluggyCategory: z.string(),
  categoryId: z.uuid().nullable(),
});
const pluggyMappingListSchema = z.object({ items: z.array(pluggyMappingSchema) });

export type Category = z.infer<typeof categorySchema>;
export type CategoryRule = z.infer<typeof ruleSchema>;
export type PluggyMapping = z.infer<typeof pluggyMappingSchema>;

export interface CategoryInput {
  readonly name: string;
  readonly kind: CategoryKind;
  readonly icon: string;
}

export interface CategoryRuleInput {
  readonly pattern: string;
  readonly matchType: MatchType;
  readonly categoryId: string;
  readonly priority: number;
}

// Listagens sem paginação: o backend devolve todas (categorias, regras e mapeamentos são poucos).
export async function listCategories(options: { includeArchived: boolean }): Promise<Category[]> {
  const query = options.includeArchived ? '?includeArchived=true' : '';
  return (await apiGet(`/categories${query}`, categoryListSchema)).items;
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return apiPost('/categories', input, categorySchema);
}

export function updateCategory(categoryId: string, input: CategoryInput): Promise<Category> {
  return apiPut(`/categories/${categoryId}`, input, categorySchema);
}

export function archiveCategory(categoryId: string): Promise<Category> {
  return apiPost(`/categories/${categoryId}/archive`, undefined, categorySchema);
}

export async function listCategoryRules(): Promise<CategoryRule[]> {
  return (await apiGet('/category-rules', ruleListSchema)).items;
}

export function createCategoryRule(input: CategoryRuleInput): Promise<CategoryRule> {
  return apiPost('/category-rules', input, ruleSchema);
}

export function updateCategoryRule(
  ruleId: string,
  input: CategoryRuleInput,
): Promise<CategoryRule> {
  return apiPut(`/category-rules/${ruleId}`, input, ruleSchema);
}

export function deleteCategoryRule(ruleId: string): Promise<void> {
  return apiDelete(`/category-rules/${ruleId}`);
}

export async function listPluggyMappings(): Promise<PluggyMapping[]> {
  return (await apiGet('/pluggy-category-mappings', pluggyMappingListSchema)).items;
}

/** `categoryId` nulo limpa o mapeamento. */
export function setPluggyMapping(
  pluggyCategory: string,
  categoryId: string | null,
): Promise<PluggyMapping> {
  return apiPut(
    `/pluggy-category-mappings/${encodeURIComponent(pluggyCategory)}`,
    { categoryId },
    pluggyMappingSchema,
  );
}
