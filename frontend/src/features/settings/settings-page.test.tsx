import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from '@/components/theme-provider';

import { Component as SettingsPage } from './settings-page';

const MINIMUM_TOUCH_TARGET_CLASS = 'h-11';

function renderSettings() {
  return render(
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>,
  );
}

describe('SettingsPage theme control', () => {
  it('should_mark_system_option_when_no_theme_was_saved', () => {
    // Arrange / Act
    renderSettings();
    // Assert
    expect(screen.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true');
  });

  it('should_not_mark_light_option_when_system_is_the_current_choice', () => {
    // Arrange / Act
    renderSettings();
    // Assert
    expect(screen.getByRole('radio', { name: 'Claro' })).toHaveAttribute('aria-checked', 'false');
  });

  it('should_switch_to_dark_theme_when_dark_option_is_pressed', async () => {
    // Arrange
    renderSettings();
    // Act
    await userEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
    // Assert
    expect(document.documentElement).toHaveClass('dark');
  });

  it('should_mark_dark_option_when_dark_option_is_pressed', async () => {
    // Arrange
    renderSettings();
    // Act
    await userEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
    // Assert
    expect(screen.getByRole('radio', { name: 'Escuro' })).toHaveAttribute('aria-checked', 'true');
  });

  it('should_label_the_group_with_the_theme_heading', () => {
    // Arrange / Act
    renderSettings();
    // Assert
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
  });

  it('should_keep_a_44px_touch_target_on_every_option', () => {
    // Arrange / Act
    renderSettings();
    // Assert
    expect(screen.getByRole('radio', { name: 'Claro' })).toHaveClass(MINIMUM_TOUCH_TARGET_CLASS);
  });
});
