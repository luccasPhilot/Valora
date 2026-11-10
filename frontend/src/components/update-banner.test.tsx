import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpdateBanner } from './update-banner';

const registerMock = vi.hoisted(() => ({
  isUpdateAvailable: false,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [registerMock.isUpdateAvailable, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: registerMock.updateServiceWorker,
  }),
}));

describe('UpdateBanner', () => {
  it('should_show_nothing_when_there_is_no_new_version', () => {
    // Arrange
    // Act
    render(<UpdateBanner isUpdateAvailable={false} onUpdate={vi.fn()} />);
    // Assert
    expect(screen.queryByText('Nova versão disponível')).not.toBeInTheDocument();
  });

  it('should_show_the_notice_with_the_update_action_when_there_is_a_new_version', () => {
    // Arrange
    // Act
    render(<UpdateBanner isUpdateAvailable onUpdate={vi.fn()} />);
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Nova versão disponível');
  });

  it('should_not_update_anything_until_the_user_presses_update', () => {
    // Arrange
    const onUpdate = vi.fn();
    // Act
    render(<UpdateBanner isUpdateAvailable onUpdate={onUpdate} />);
    // Assert
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should_update_when_the_user_presses_update', async () => {
    // Arrange
    const onUpdate = vi.fn();
    render(<UpdateBanner isUpdateAvailable onUpdate={onUpdate} />);
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    // Assert
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('UpdatePrompt', () => {
  it('should_not_reload_the_page_until_update_is_pressed_when_a_new_version_is_waiting', async () => {
    // Arrange
    registerMock.isUpdateAvailable = true;
    registerMock.updateServiceWorker.mockClear();
    const { UpdatePrompt } = await import('./update-prompt');
    render(<UpdatePrompt />);
    // Act
    const callsBeforePress = registerMock.updateServiceWorker.mock.calls.length;
    // Assert
    expect(callsBeforePress).toBe(0);
  });

  it('should_activate_the_new_version_and_reload_when_update_is_pressed', async () => {
    // Arrange
    registerMock.isUpdateAvailable = true;
    registerMock.updateServiceWorker.mockClear();
    const { UpdatePrompt } = await import('./update-prompt');
    render(<UpdatePrompt />);
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    // Assert
    expect(registerMock.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
