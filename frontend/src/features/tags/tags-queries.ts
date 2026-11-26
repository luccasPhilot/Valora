import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import { createTag, deleteTag, listTags, renameTag, type Tag } from '@/lib/api/tags';
import { queryKeys } from '@/lib/query-keys';

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags, queryFn: listTags });
}

export function useCreateTag() {
  return useMutation({ mutationFn: createTag, onSuccess: useInvalidateAfter('tags') });
}

export interface TagRename {
  readonly tag: Tag;
  readonly name: string;
}

export function useRenameTag() {
  return useMutation({
    mutationFn: ({ tag, name }: TagRename) => renameTag(tag.id, name),
    onSuccess: useInvalidateAfter('tags'),
  });
}

export function useDeleteTag() {
  return useMutation({
    mutationFn: (tag: Tag) => deleteTag(tag.id),
    onSuccess: useInvalidateAfter('tags'),
  });
}
