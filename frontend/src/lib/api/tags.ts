import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '../api-client';

// Contrato de /tags. O backend é o dono; estes schemas são a cópia do front
// (docs/03-arquitetura.md, "Contrato da API").

/** Tamanhos máximos aceitos pela API. */
export const MAX_TAG_NAME_LENGTH = 40;
export const MAX_TAGS_PER_TRANSACTION = 10;

const tagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Quantas transações têm esta etiqueta. */
  transactionCount: z.int(),
});
const tagListSchema = z.object({ items: z.array(tagSchema) });

export type Tag = z.infer<typeof tagSchema>;

// Listagem sem paginação: o backend devolve todas (uma pessoa tem dezenas de etiquetas).
export async function listTags(): Promise<Tag[]> {
  return (await apiGet('/tags', tagListSchema)).items;
}

export function createTag(name: string): Promise<Tag> {
  return apiPost('/tags', { name }, tagSchema);
}

export function renameTag(tagId: string, name: string): Promise<Tag> {
  return apiPatch(`/tags/${tagId}`, { name }, tagSchema);
}

export function deleteTag(tagId: string): Promise<void> {
  return apiDelete(`/tags/${tagId}`);
}
