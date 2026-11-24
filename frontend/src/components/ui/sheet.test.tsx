import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

describe('SheetContent', () => {
  it('should_give_the_close_button_a_44px_touch_target_when_the_sheet_is_open', () => {
    // Arrange / Act
    render(
      <Sheet open>
        <SheetContent side="bottom">
          <SheetTitle>Editar previsão</SheetTitle>
          <SheetDescription>Aluguel</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    // Assert
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveClass('size-11');
  });
});
