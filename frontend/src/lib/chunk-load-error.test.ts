import { afterEach, describe, expect, it } from 'vitest';

import { isChunkLoadError, markChunkReload, shouldReloadForChunkError } from './chunk-load-error';

const NOW = Date.parse('2026-11-24T13:00:00Z');
const CHROME_ERROR = new TypeError(
  'Failed to fetch dynamically imported module: https://valora.local/assets/goals-page-B1x9.js',
);

afterEach(() => {
  window.sessionStorage.clear();
});

describe('isChunkLoadError', () => {
  it('should_detect_the_chrome_message', () => {
    // Arrange
    const error = CHROME_ERROR;
    // Act
    const isChunkError = isChunkLoadError(error);
    // Assert
    expect(isChunkError).toBe(true);
  });

  it('should_detect_the_safari_message', () => {
    // Arrange
    const error = new TypeError('Importing a module script failed.');
    // Act
    const isChunkError = isChunkLoadError(error);
    // Assert
    expect(isChunkError).toBe(true);
  });

  it('should_detect_the_firefox_message', () => {
    // Arrange
    const error = new TypeError(
      'error loading dynamically imported module: https://valora.local/assets/goals-page-B1x9.js',
    );
    // Act
    const isChunkError = isChunkLoadError(error);
    // Assert
    expect(isChunkError).toBe(true);
  });

  it('should_detect_the_vite_css_preload_message', () => {
    // Arrange
    const error = new Error('Unable to preload CSS for /assets/goals-page-C2y8.css');
    // Act
    const isChunkError = isChunkLoadError(error);
    // Assert
    expect(isChunkError).toBe(true);
  });

  it('should_not_treat_a_render_exception_as_a_chunk_error', () => {
    // Arrange
    const error = new TypeError("Cannot read properties of undefined (reading 'name')");
    // Act
    const isChunkError = isChunkLoadError(error);
    // Assert
    expect(isChunkError).toBe(false);
  });

  it('should_not_treat_a_value_that_is_not_an_error_as_a_chunk_error', () => {
    // Arrange
    const thrown = 'Failed to fetch dynamically imported module';
    // Act
    const isChunkError = isChunkLoadError(thrown);
    // Assert
    expect(isChunkError).toBe(false);
  });
});

describe('shouldReloadForChunkError', () => {
  it('should_reload_when_a_chunk_fails_for_the_first_time', () => {
    // Arrange
    const error = CHROME_ERROR;
    // Act
    const shouldReload = shouldReloadForChunkError(error, NOW);
    // Assert
    expect(shouldReload).toBe(true);
  });

  it('should_not_reload_again_when_the_chunk_fails_right_after_the_reload', () => {
    // Arrange
    markChunkReload(NOW);
    // Act
    const shouldReload = shouldReloadForChunkError(CHROME_ERROR, NOW + 5_000);
    // Assert
    expect(shouldReload).toBe(false);
  });

  it('should_reload_again_when_the_last_reload_was_long_ago', () => {
    // Arrange
    markChunkReload(NOW);
    // Act
    const shouldReload = shouldReloadForChunkError(CHROME_ERROR, NOW + 60_000);
    // Assert
    expect(shouldReload).toBe(true);
  });

  it('should_not_reload_when_the_error_is_not_a_chunk_error', () => {
    // Arrange
    const error = new Error('boom');
    // Act
    const shouldReload = shouldReloadForChunkError(error, NOW);
    // Assert
    expect(shouldReload).toBe(false);
  });
});
