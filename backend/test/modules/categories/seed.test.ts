import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DEFAULT_CATEGORIES } from '../../../src/modules/categories/seed/default-categories.js';
import { PLUGGY_CATEGORIES } from '../../../src/modules/categories/seed/pluggy-categories.js';
import { INITIAL_PLUGGY_MAPPINGS } from '../../../src/modules/categories/seed/pluggy-category-map.js';

const pluggyCategoriesSchema = z.object({
  categories: z.array(z.object({ description: z.string() })),
});

function recordedPluggyCategories(): Set<string> {
  const file = new URL('../../fixtures/pluggy/categories.json', import.meta.url);
  const { categories } = pluggyCategoriesSchema.parse(JSON.parse(readFileSync(file, 'utf-8')));
  return new Set(categories.map((category) => category.description));
}

describe('categorias padrão', () => {
  it('should_have_unique_seed_keys_and_names', () => {
    // Arrange
    const total = DEFAULT_CATEGORIES.length;
    // Act
    const uniqueKeys = new Set(DEFAULT_CATEGORIES.map((category) => category.seedKey));
    const uniqueNames = new Set(DEFAULT_CATEGORIES.map((category) => category.name));
    // Assert
    expect({ keys: uniqueKeys.size, names: uniqueNames.size }).toEqual({
      keys: total,
      names: total,
    });
  });

  it.each([
    { name: 'Pagamento de fatura', kind: 'transfer' },
    { name: 'Transferência entre contas', kind: 'transfer' },
    { name: 'Aplicação e resgate', kind: 'transfer' },
    { name: 'Saque', kind: 'expense' },
  ])('should_define_$name_as_$kind', ({ name, kind }) => {
    // Arrange
    // Act
    const category = DEFAULT_CATEGORIES.find((candidate) => candidate.name === name);
    // Assert
    expect(category?.kind).toBe(kind);
  });
});

describe('mapeamento inicial do Pluggy', () => {
  it('should_map_each_pluggy_category_only_once', () => {
    // Arrange
    const names = INITIAL_PLUGGY_MAPPINGS.map((mapping) => mapping.pluggyCategory);
    // Act
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    // Assert
    expect(duplicates).toEqual([]);
  });

  it('should_only_use_categories_that_exist_in_the_recorded_pluggy_list', () => {
    // Arrange
    const recorded = recordedPluggyCategories();
    // Act
    const unknown = INITIAL_PLUGGY_MAPPINGS.map((mapping) => mapping.pluggyCategory).filter(
      (name) => !recorded.has(name),
    );
    // Assert
    expect(unknown).toEqual([]);
  });
});

describe('lista de categorias do Pluggy', () => {
  it('should_match_the_recorded_pluggy_list', () => {
    // Arrange
    const recorded = [...recordedPluggyCategories()].sort();
    // Act
    const listed = [...PLUGGY_CATEGORIES].sort();
    // Assert
    expect(listed).toEqual(recorded);
  });
});
