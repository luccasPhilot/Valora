import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HideValuesProvider } from '@/components/hide-values-provider';
import type { SpendingItem } from '@/lib/api/dashboard';

import { SpendingByCategory } from './spending-by-category';

const HOUSING_ID = '11111111-1111-4111-8111-111111111111';
const FOOD_ID = '22222222-2222-4222-8222-222222222222';

function categoryItem(categoryId: string, name: string, percent: number): SpendingItem {
  return { kind: 'category', categoryId, name, icon: 'home', amountCents: percent * 100, percent };
}

function renderedBarWidths(items: readonly SpendingItem[]): string[] {
  const { container } = render(
    <MemoryRouter>
      <HideValuesProvider>
        <SpendingByCategory items={items} month="2026-11" />
      </HideValuesProvider>
    </MemoryRouter>,
  );
  const fills = container.querySelectorAll<HTMLElement>('span.bg-primary[style]');
  return Array.from(fills, (fill) => fill.style.width);
}

describe('SpendingByCategory — barras', () => {
  it('should_fill_each_bar_with_the_share_of_the_total_when_the_top_category_is_not_100_percent', () => {
    // Arrange
    const items = [categoryItem(HOUSING_ID, 'Moradia', 89), categoryItem(FOOD_ID, 'Mercado', 11)];

    // Act
    const widths = renderedBarWidths(items);

    // Assert
    expect(widths).toEqual(['89%', '11%']);
  });

  it('should_keep_a_single_category_bar_full_when_it_is_100_percent_of_the_total', () => {
    // Arrange
    const items = [categoryItem(HOUSING_ID, 'Moradia', 100)];

    // Act
    const widths = renderedBarWidths(items);

    // Assert
    expect(widths).toEqual(['100%']);
  });
});
