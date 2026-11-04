import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { HideValuesButton } from './hide-values-button';
import { HideValuesProvider } from './hide-values-provider';
import { Money } from './money';

function renderMoney() {
  return render(
    <HideValuesProvider>
      <HideValuesButton />
      <Money cents={123456} />
      <Money cents={-8990} isSigned />
    </HideValuesProvider>,
  );
}

describe('Money', () => {
  it('should_show_formatted_values_when_values_are_visible', () => {
    // Arrange / Act
    renderMoney();
    // Assert
    expect(screen.getByText('R$ 1.234,56')).toBeVisible();
  });

  it('should_replace_every_value_with_dots_when_hide_button_is_pressed', async () => {
    // Arrange
    renderMoney();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(screen.getAllByText('R$ ••••')).toHaveLength(2);
  });

  it('should_keep_values_hidden_after_reload_when_user_hid_them', async () => {
    // Arrange
    const firstVisit = renderMoney();
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    firstVisit.unmount();
    // Act
    renderMoney();
    // Assert
    expect(screen.getAllByText('R$ ••••')).toHaveLength(2);
  });

  it('should_show_values_again_when_hide_button_is_pressed_twice', async () => {
    // Arrange
    renderMoney();
    const button = screen.getByRole('button', { name: 'Ocultar valores' });
    // Act
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar valores' }));
    // Assert
    expect(screen.getByText('R$ 1.234,56')).toBeVisible();
  });
});
