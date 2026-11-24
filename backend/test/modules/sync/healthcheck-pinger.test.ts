import { describe, expect, it, vi } from 'vitest';

import { HealthcheckPinger } from '../../../src/modules/sync/healthcheck-pinger.js';

const PING_URL = 'https://hc-ping.com/00000000-0000-4000-8000-000000000000';
const SHORT_TIMEOUT_MS = 20;

interface LogCall {
  readonly fields: Record<string, unknown>;
  readonly message: string;
}

function recordingLogger() {
  const calls: LogCall[] = [];
  return {
    calls,
    logger: {
      warn: (fields: Record<string, unknown>, message: string) => calls.push({ fields, message }),
    },
  };
}

function okFetch() {
  return vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 200 }));
}

function hangingFetch(): typeof globalThis.fetch {
  return (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    });
}

describe('HealthcheckPinger', () => {
  it('should_call_url_when_result_is_success', async () => {
    // Arrange
    const fetch = okFetch();
    const pinger = new HealthcheckPinger({
      url: PING_URL,
      fetch,
      logger: recordingLogger().logger,
    });
    // Act
    await pinger.report('success');
    // Assert
    expect(fetch).toHaveBeenCalledWith(PING_URL, expect.anything());
  });

  it('should_call_fail_suffix_when_result_is_fail', async () => {
    // Arrange
    const fetch = okFetch();
    const pinger = new HealthcheckPinger({
      url: PING_URL,
      fetch,
      logger: recordingLogger().logger,
    });
    // Act
    await pinger.report('fail');
    // Assert
    expect(fetch).toHaveBeenCalledWith(`${PING_URL}/fail`, expect.anything());
  });

  it('should_not_call_fetch_when_url_is_null', async () => {
    // Arrange
    const fetch = okFetch();
    const pinger = new HealthcheckPinger({ url: null, fetch, logger: recordingLogger().logger });
    // Act
    await pinger.report('success');
    // Assert
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should_resolve_and_log_error_type_when_fetch_rejects', async () => {
    // Arrange
    const { calls, logger } = recordingLogger();
    const fetch: typeof globalThis.fetch = () => Promise.reject(new TypeError('fetch failed'));
    const pinger = new HealthcheckPinger({ url: PING_URL, fetch, logger });
    // Act
    await pinger.report('success');
    // Assert
    expect(calls).toEqual([
      { fields: { errorType: 'TypeError' }, message: 'healthcheck ping failed' },
    ]);
  });

  it('should_resolve_and_log_timeout_when_server_does_not_answer', async () => {
    // Arrange
    const { calls, logger } = recordingLogger();
    const pinger = new HealthcheckPinger({
      url: PING_URL,
      fetch: hangingFetch(),
      logger,
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    // Act
    await pinger.report('success');
    // Assert
    expect(calls[0]?.fields).toEqual({ errorType: 'TimeoutError' });
  });

  it('should_log_status_code_when_response_is_not_ok', async () => {
    // Arrange
    const { calls, logger } = recordingLogger();
    const fetch: typeof globalThis.fetch = async () => new Response(null, { status: 404 });
    const pinger = new HealthcheckPinger({ url: PING_URL, fetch, logger });
    // Act
    await pinger.report('success');
    // Assert
    expect(calls).toEqual([{ fields: { statusCode: 404 }, message: 'healthcheck ping rejected' }]);
  });

  it('should_never_log_url', async () => {
    // Arrange
    const { calls, logger } = recordingLogger();
    const fetch: typeof globalThis.fetch = () => Promise.reject(new Error(`falhou: ${PING_URL}`));
    const pinger = new HealthcheckPinger({ url: PING_URL, fetch, logger });
    // Act
    await pinger.report('fail');
    // Assert
    expect(JSON.stringify(calls)).not.toContain('hc-ping.com');
  });
});
