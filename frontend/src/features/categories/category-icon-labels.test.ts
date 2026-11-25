import { describe, expect, it } from 'vitest';

import { hasIconLabel, iconLabel } from './category-icon-labels';
import { SUGGESTED_ICON_NAMES } from './category-icons';

describe('iconLabel', () => {
  it('should_name_every_icon_offered_by_the_picker_in_portuguese', () => {
    // Arrange / Act
    const unnamedIcons = SUGGESTED_ICON_NAMES.filter((iconName) => !hasIconLabel(iconName));
    // Assert
    expect(unnamedIcons).toEqual([]);
  });

  it('should_name_the_cart_icon_as_shopping_cart_in_portuguese', () => {
    // Arrange / Act
    const label = iconLabel('shopping-cart');
    // Assert
    expect(label).toBe('Carrinho de compras');
  });

  it('should_fall_back_to_a_generic_name_when_the_icon_is_unknown', () => {
    // Arrange / Act
    const label = iconLabel('unknown-icon');
    // Assert
    expect(label).toBe('Ícone');
  });
});
