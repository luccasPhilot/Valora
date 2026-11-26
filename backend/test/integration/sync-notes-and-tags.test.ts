import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tags, transactions, transactionTags } from '../../src/db/schema.js';
import type { PluggyItemFixture } from '../helpers/fake-pluggy-sdk.js';
import {
  buildSyncHarness,
  findTransaction,
  fixtureOf,
  runSync,
  type SyncHarness,
  withoutTransaction,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// O cartão do item-2. Valor que nenhuma transação das fixtures tem.
const CARD_ACCOUNT_ID = 'acc-3';
const AMOUNT_IN_REAIS = 89.9;
const PENDING_ID = 'tx-pending-annotated';
const PENDING_DATE = '2026-11-10';

let harness: SyncHarness;
let card: PluggyItemFixture;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
  card = fixtureOf(harness.fixtures, 'item-2');
});

afterEach(async () => {
  await harness.app.close();
});

function syncOn(isoDate: string): void {
  harness.clock.now = new Date(`${isoDate}T15:00:00.000Z`);
}

function addCardTransaction(id: string, options: { date: string; status: 'PENDING' | 'POSTED' }) {
  const [template] = card.transactions.filter((tx) => tx.accountId === CARD_ACCOUNT_ID);
  if (!template) throw new Error('Teste: cartão sem transação nas fixtures');
  card.transactions.push({
    ...structuredClone(template),
    id,
    date: `${options.date}T15:00:00.000Z`,
    type: 'DEBIT',
    amount: AMOUNT_IN_REAIS,
    amountInAccountCurrency: null,
    status: options.status,
    creditCardMetadata: null,
  });
}

/** Sincroniza a pendente e grava nela a nota e/ou uma etiqueta, como o usuário faria. */
async function syncPendingWithAnnotation(options: {
  note?: string;
  tagName?: string;
}): Promise<void> {
  addCardTransaction(PENDING_ID, { date: PENDING_DATE, status: 'PENDING' });
  syncOn(PENDING_DATE);
  await runSync(harness.syncService);
  const pending = await findTransaction(harness.database, PENDING_ID);
  if (!pending) throw new Error('Teste: pendente não foi gravada');
  const { db } = harness.database;
  if (options.note) {
    await db
      .update(transactions)
      .set({ note: options.note, noteNormalized: options.note.toUpperCase() })
      .where(eq(transactions.id, pending.id));
  }
  if (options.tagName) {
    const [tag] = await db
      .insert(tags)
      .values({ name: options.tagName, nameNormalized: options.tagName.toUpperCase() })
      .returning({ id: tags.id });
    if (!tag) throw new Error('Teste: etiqueta não foi criada');
    await db.insert(transactionTags).values({ transactionId: pending.id, tagId: tag.id });
  }
}

async function annotationsOf(pluggyTransactionId: string) {
  const row = await findTransaction(harness.database, pluggyTransactionId);
  if (!row) return undefined;
  const links = await harness.database.db
    .select({ name: tags.name })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .where(eq(transactionTags.transactionId, row.id));
  return { note: row.note, tagNames: links.map((link) => link.name) };
}

describe('nota e etiquetas na sincronização', () => {
  it('should_keep_note_and_tags_when_the_sync_updates_the_transaction', async () => {
    // Arrange
    await syncPendingWithAnnotation({ note: 'Reembolsar', tagName: 'Viagem' });
    // Act
    syncOn('2026-11-11');
    await runSync(harness.syncService);
    // Assert
    expect(await annotationsOf(PENDING_ID)).toEqual({ note: 'Reembolsar', tagNames: ['Viagem'] });
  });

  it('should_give_the_tag_to_the_posted_transaction_when_a_tagged_pending_is_replaced', async () => {
    // Arrange
    await syncPendingWithAnnotation({ tagName: 'Viagem' });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      posted: await annotationsOf('tx-posted'),
      pending: await findTransaction(harness.database, PENDING_ID),
    }).toEqual({ posted: { note: null, tagNames: ['Viagem'] }, pending: undefined });
  });

  it('should_give_the_note_to_the_posted_transaction_when_a_pending_with_a_note_is_replaced', async () => {
    // Arrange
    await syncPendingWithAnnotation({ note: 'Presente' });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await annotationsOf('tx-posted')).toEqual({ note: 'Presente', tagNames: [] });
  });

  it('should_keep_a_pending_with_only_a_note_within_the_grace_period_when_it_vanishes', async () => {
    // Arrange
    await syncPendingWithAnnotation({ note: 'Presente' });
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await annotationsOf(PENDING_ID))?.note).toBe('Presente');
  });

  it('should_delete_a_pending_without_note_or_tags_when_it_vanishes', async () => {
    // Arrange
    addCardTransaction(PENDING_ID, { date: PENDING_DATE, status: 'PENDING' });
    syncOn(PENDING_DATE);
    await runSync(harness.syncService);
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, PENDING_ID)).toBeUndefined();
  });
});
