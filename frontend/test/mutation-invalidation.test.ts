import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Toda gravação diz o que muda pelo mapa de `src/lib/query-keys.ts`. Uma mutation nova que esqueça o
// mapa deixaria telas com números velhos, e o lint não pega: este teste pega.

const SRC_DIR = join(import.meta.dirname, '../src');
const MUTATION_CALL = 'useMutation(';
const ALLOWED_MARKERS = ['useInvalidateAfter', 'Fora do mapa de invalidação'];

/** O texto das opções de cada `useMutation(...)`, até o parêntese que fecha a chamada. */
function mutationOptions(source: string): string[] {
  const blocks: string[] = [];
  let start = source.indexOf(MUTATION_CALL);
  while (start !== -1) {
    let depth = 0;
    let end = start + MUTATION_CALL.length - 1;
    do {
      if (source[end] === '(') depth += 1;
      if (source[end] === ')') depth -= 1;
      end += 1;
    } while (depth > 0 && end < source.length);
    blocks.push(source.slice(start, end));
    start = source.indexOf(MUTATION_CALL, end);
  }
  return blocks;
}

/** Quantas mutations do arquivo não usam o mapa nem dizem por quê. */
function countUnmappedMutations(source: string): number {
  return mutationOptions(source).filter(
    (options) => !ALLOWED_MARKERS.some((marker) => options.includes(marker)),
  ).length;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name);
    return isSource ? [path] : [];
  });
}

describe('countUnmappedMutations', () => {
  it('should_count_a_mutation_that_invalidates_by_hand', () => {
    // Arrange
    const source =
      'useMutation({ mutationFn: save, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });';
    // Act
    const count = countUnmappedMutations(source);
    // Assert
    expect(count).toBe(1);
  });

  it('should_accept_a_mutation_that_uses_the_invalidation_map', () => {
    // Arrange
    const source = "useMutation({ mutationFn: save, onSuccess: useInvalidateAfter('goals') });";
    // Act
    const count = countUnmappedMutations(source);
    // Assert
    expect(count).toBe(0);
  });

  it('should_accept_a_mutation_that_says_why_it_stays_out_of_the_map', () => {
    // Arrange
    const source = `useMutation({
      // Fora do mapa de invalidação: recarrega tudo.
      mutationFn: archive,
      onSuccess: () => queryClient.invalidateQueries(),
    });`;
    // Act
    const count = countUnmappedMutations(source);
    // Assert
    expect(count).toBe(0);
  });
});

describe('mutations do app', () => {
  it('should_use_the_invalidation_map_in_every_mutation_of_the_app', () => {
    // Arrange
    const files = sourceFiles(SRC_DIR);
    // Act
    const unmapped = files
      .filter((file) => countUnmappedMutations(readFileSync(file, 'utf8')) > 0)
      .map((file) => relative(SRC_DIR, file));
    // Assert
    expect(unmapped).toEqual([]);
  });
});
