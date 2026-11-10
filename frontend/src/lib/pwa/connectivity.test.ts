import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CACHED_AT_HEADER } from './cache-rules';
import { recordApiNetworkFailure, recordApiResponse, useConnectivity } from './connectivity';

const CACHED_AT_TEXT = 'Wed, 05 Nov 2026 11:12:00 GMT';

function readState() {
  return renderHook(() => useConnectivity()).result.current;
}

describe('estado de conectividade', () => {
  it('should_mark_the_data_as_cached_when_a_read_response_carries_the_cached_at_header', () => {
    // Arrange
    const headers = new Headers({ [CACHED_AT_HEADER]: CACHED_AT_TEXT });
    // Act
    recordApiResponse('GET', headers);
    // Assert
    expect(readState().cachedAt).toEqual(new Date('2026-11-05T11:12:00Z'));
  });

  it('should_clear_the_cached_mark_when_a_later_read_comes_from_the_network', () => {
    // Arrange
    recordApiResponse('GET', new Headers({ [CACHED_AT_HEADER]: CACHED_AT_TEXT }));
    // Act
    recordApiResponse('GET', new Headers());
    // Assert
    expect(readState().cachedAt).toBeNull();
  });

  it('should_ignore_an_invalid_cached_at_header', () => {
    // Arrange
    const headers = new Headers({ [CACHED_AT_HEADER]: 'não é uma data' });
    // Act
    recordApiResponse('GET', headers);
    // Assert
    expect(readState().cachedAt).toBeNull();
  });

  it('should_mark_the_server_as_unreachable_when_a_read_fails_without_network', () => {
    // Arrange
    // Act
    recordApiNetworkFailure('GET');
    // Assert
    expect(readState()).toMatchObject({ isServerUnreachable: true, hasBlockedWrite: false });
  });

  it('should_mark_a_blocked_write_when_a_write_fails_without_network', () => {
    // Arrange
    // Act
    recordApiNetworkFailure('POST');
    // Assert
    expect(readState()).toMatchObject({ isServerUnreachable: true, hasBlockedWrite: true });
  });

  it('should_recover_when_the_server_answers_again_after_a_failed_write', () => {
    // Arrange
    recordApiNetworkFailure('POST');
    // Act
    recordApiResponse('POST', new Headers());
    // Assert
    expect(readState()).toMatchObject({ isServerUnreachable: false, hasBlockedWrite: false });
  });

  it('should_follow_the_browser_offline_and_online_events', () => {
    // Arrange
    const { result } = renderHook(() => useConnectivity());
    // Act
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    const wasOffline = !result.current.isOnline;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    // Assert
    expect({ wasOffline, isOnlineAgain: result.current.isOnline }).toEqual({
      wasOffline: true,
      isOnlineAgain: true,
    });
  });
});
