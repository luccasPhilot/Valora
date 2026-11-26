import { describe, expect, it, vi } from 'vitest';

import { PushNotifier } from '../../../src/modules/push/push-notifier.js';
import type { PushPayload } from '../../../src/modules/push/push-sender.js';

interface NotifierSetup {
  readonly notifier: PushNotifier;
  readonly broadcast: ReturnType<typeof vi.fn<(payload: PushPayload) => Promise<void>>>;
  readonly errors: Record<string, unknown>[];
  readonly clock: { now: Date };
}

interface SetupOptions {
  readonly unreviewedCount?: number;
  readonly isEnabled?: boolean;
  readonly broadcastFails?: boolean;
}

function setup({
  unreviewedCount = 0,
  isEnabled = true,
  broadcastFails = false,
}: SetupOptions = {}): NotifierSetup {
  const broadcast = vi.fn<(payload: PushPayload) => Promise<void>>(async () => {
    if (broadcastFails) throw new TypeError('falha com dado sensível 123,45');
  });
  const errors: Record<string, unknown>[] = [];
  const clock = { now: new Date('2026-11-25T13:00:00Z') };
  const notifier = new PushNotifier({
    push: { isEnabled, broadcast },
    reviews: { countUnreviewed: async () => unreviewedCount },
    logger: { error: (details) => errors.push(details) },
    now: () => clock.now,
  });
  return { notifier, broadcast, errors, clock };
}

describe('notifyReviewInboxIfFull', () => {
  it('should_not_notify_when_the_inbox_has_nine_transactions', async () => {
    // Arrange
    const { notifier, broadcast } = setup({ unreviewedCount: 9 });
    // Act
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should_notify_when_the_inbox_has_ten_transactions', async () => {
    // Arrange
    const { notifier, broadcast } = setup({ unreviewedCount: 10 });
    // Act
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Há transações para revisar', url: '/transacoes/revisar' }),
    );
  });

  it('should_notify_only_once_when_the_inbox_is_full_twice_on_the_same_day', async () => {
    // Arrange
    const { notifier, broadcast } = setup({ unreviewedCount: 14 });
    // Act
    await notifier.notifyReviewInboxIfFull();
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it('should_notify_again_when_the_inbox_is_full_on_the_next_day', async () => {
    // Arrange
    const { notifier, broadcast, clock } = setup({ unreviewedCount: 14 });
    await notifier.notifyReviewInboxIfFull();
    clock.now = new Date('2026-11-26T13:00:00Z');
    // Act
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(broadcast).toHaveBeenCalledTimes(2);
  });

  it('should_not_notify_when_push_is_disabled', async () => {
    // Arrange
    const { notifier, broadcast } = setup({ unreviewedCount: 20, isEnabled: false });
    // Act
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should_log_only_the_error_type_when_sending_fails', async () => {
    // Arrange
    const { notifier, errors } = setup({ unreviewedCount: 20, broadcastFails: true });
    // Act
    await notifier.notifyReviewInboxIfFull();
    // Assert
    expect(errors).toEqual([{ errorType: 'TypeError' }]);
  });
});

describe('notifyNewAlerts', () => {
  it('should_not_notify_when_there_are_no_new_alerts', async () => {
    // Arrange
    const { notifier, broadcast } = setup();
    // Act
    await notifier.notifyNewAlerts([]);
    // Assert
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should_not_throw_and_log_only_the_error_type_when_sending_fails', async () => {
    // Arrange
    const { notifier, errors } = setup({ broadcastFails: true });
    // Act
    await notifier.notifyNewAlerts(['budget_exceeded']);
    // Assert
    expect(errors).toEqual([{ errorType: 'TypeError' }]);
  });
});
