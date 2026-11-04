import type { HealthRepository } from './health.repository.js';

export type HealthStatus =
  | { readonly status: 'ok'; readonly database: 'ok' }
  | { readonly status: 'degraded'; readonly database: 'unavailable' };

export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<HealthStatus> {
    const isDatabaseReachable = await this.repository.isDatabaseReachable();
    return isDatabaseReachable
      ? { status: 'ok', database: 'ok' }
      : { status: 'degraded', database: 'unavailable' };
  }
}
