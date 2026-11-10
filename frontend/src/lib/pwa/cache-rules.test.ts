import { describe, expect, it } from 'vitest';

import { shouldCacheApiRequest } from './cache-rules';

describe('shouldCacheApiRequest', () => {
  it('should_cache_when_a_get_reads_the_budgets', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/budgets' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(true);
  });

  it('should_cache_when_a_get_reads_the_dashboard', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/dashboard' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(true);
  });

  it('should_not_cache_when_the_path_is_the_latest_sync_run', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/sync-runs/latest' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(false);
  });

  it('should_not_cache_when_the_path_is_the_sync_runs_collection', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/sync-runs' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(false);
  });

  it('should_not_cache_when_the_path_is_health', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/health' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(false);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'should_not_cache_when_the_method_is_%s',
    (method) => {
      // Arrange
      const request = { method, pathname: '/api/v1/budgets' };
      // Act
      const isCached = shouldCacheApiRequest(request);
      // Assert
      expect(isCached).toBe(false);
    },
  );

  it('should_not_cache_when_the_path_is_outside_the_api', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/orcamentos' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(false);
  });

  it('should_cache_when_a_path_only_starts_like_health', () => {
    // Arrange
    const request = { method: 'GET', pathname: '/api/v1/healthy-things' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(true);
  });

  it('should_match_the_method_case_insensitively', () => {
    // Arrange
    const request = { method: 'get', pathname: '/api/v1/goals' };
    // Act
    const isCached = shouldCacheApiRequest(request);
    // Assert
    expect(isCached).toBe(true);
  });
});
