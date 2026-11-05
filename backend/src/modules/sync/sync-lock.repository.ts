import type pg from 'pg';

// Chave fixa que identifica "a sincronização" no PostgreSQL. Qualquer número serve, desde que seja
// sempre o mesmo e não seja usado por outro lock.
const SYNC_ADVISORY_LOCK_KEY = 74_060_001;

export interface SyncLockHandle {
  release(): Promise<void>;
}

/**
 * Garante uma sincronização por vez com `pg_try_advisory_lock`. O lock é da sessão: fica preso num
 * client dedicado do pool até o `release()`. Se o processo cair, a sessão fecha e o lock some junto.
 */
export class SyncLock {
  constructor(private readonly pool: pg.Pool) {}

  async tryAcquire(): Promise<SyncLockHandle | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ isLocked: boolean }>(
        'select pg_try_advisory_lock($1) as "isLocked"',
        [SYNC_ADVISORY_LOCK_KEY],
      );
      if (result.rows[0]?.isLocked === true) return { release: () => unlock(client) };
    } catch (error) {
      client.release(true);
      throw error;
    }
    client.release();
    return null;
  }
}

async function unlock(client: pg.PoolClient): Promise<void> {
  try {
    await client.query('select pg_advisory_unlock($1)', [SYNC_ADVISORY_LOCK_KEY]);
    client.release();
  } catch (error) {
    // Descartar o client fecha a sessão, e o PostgreSQL solta o lock junto.
    client.release(true);
    throw error;
  }
}
