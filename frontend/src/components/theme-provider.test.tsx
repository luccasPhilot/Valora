import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../test/helpers/match-media';
import { ThemeProvider, useTheme } from './theme-provider';

function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <button onClick={() => setPreference('light')}>Claro</button>
    </div>
  );
}

function renderThemeSwitcher() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  it('should_use_dark_theme_when_system_is_dark_and_nothing_was_saved', () => {
    // Arrange
    stubViewport({ prefersDark: true });
    // Act
    renderThemeSwitcher();
    // Assert
    expect(document.documentElement).toHaveClass('dark');
  });

  it('should_use_light_theme_when_system_is_light_and_nothing_was_saved', () => {
    // Arrange
    stubViewport({ prefersDark: false });
    // Act
    renderThemeSwitcher();
    // Assert
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('should_keep_light_theme_after_reload_when_user_chose_light_on_a_dark_system', async () => {
    // Arrange
    stubViewport({ prefersDark: true });
    const firstVisit = renderThemeSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'Claro' }));
    firstVisit.unmount();
    // Act
    renderThemeSwitcher();
    // Assert
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('should_work_as_system_when_local_storage_is_unavailable', () => {
    // Arrange
    stubViewport({ prefersDark: true });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    // Act
    renderThemeSwitcher();
    // Assert
    expect(screen.getByTestId('preference')).toHaveTextContent('system');
    vi.restoreAllMocks();
  });

  it('should_not_throw_when_saving_the_choice_fails', async () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    renderThemeSwitcher();
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Claro' }));
    // Assert
    expect(screen.getByTestId('preference')).toHaveTextContent('light');
    vi.restoreAllMocks();
  });
});
