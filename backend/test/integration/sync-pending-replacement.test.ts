import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  categoryRules,
  plannedEntries,
  plannedEntryOccurrences,
  transactions,
} from '../../src/db/schema.js';
import type { PluggyItemFixture } from '../helpers/fake-pluggy-sdk.js';
import { insertCategory, transactionValues } from './fixtures.js';
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
const PENDING_ID = 'tx-pending-replaced';
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

/** Meio-dia em São Paulo do dia pedido: o relógio da sincronização. */
function syncOn(isoDate: string): void {
  harness.clock.now = new Date(`${isoDate}T15:00:00.000Z`);
}

/** Transação do cartão no formato do Pluggy (valor em reais, compra positiva), a partir de uma das fixtures. */
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

/** Primeira sincronização com a pendente e, se pedido, a categoria escolhida pelo usuário nela. */
async function syncPending(options: { withUserCategory: boolean }): Promise<string | null> {
  addCardTransaction(PENDING_ID, { date: PENDING_DATE, status: 'PENDING' });
  syncOn(PENDING_DATE);
  await runSync(harness.syncService);
  if (!options.withUserCategory) return null;
  const categoryId = await insertCategory(harness.database.db);
  await harness.database.db
    .update(transactions)
    .set({ categoryId, categorySource: 'user' })
    .where(eq(transactions.pluggyTransactionId, PENDING_ID));
  return categoryId;
}

async function categoryOf(pluggyTransactionId: string) {
  const row = await findTransaction(harness.database, pluggyTransactionId);
  return { categoryId: row?.categoryId, categorySource: row?.categorySource };
}

async function linkPendingToPlannedEntry(categoryId: string): Promise<string> {
  const pending = await findTransaction(harness.database, PENDING_ID);
  const [entry] = await harness.database.db
    .insert(plannedEntries)
    .values({
      description: 'Previsão do teste',
      amountCents: -8990,
      categoryId,
      dayOfMonth: 10,
      recurrence: 'monthly',
      startMonth: '2026-11-01',
    })
    .returning({ id: plannedEntries.id });
  if (!entry || !pending) throw new Error('Teste: previsão ou pendente não existe');
  await harness.database.db.insert(plannedEntryOccurrences).values({
    plannedEntryId: entry.id,
    month: '2026-11-01',
    status: 'realized',
    transactionId: pending.id,
  });
  return entry.id;
}

describe('pendente com decisão do usuário trocada por postada', () => {
  it('should_carry_user_category_to_posted_when_pending_is_replaced_by_another_id', async () => {
    // Arrange
    const categoryId = await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      posted: await categoryOf('tx-posted'),
      pending: await findTransaction(harness.database, PENDING_ID),
    }).toEqual({ posted: { categoryId, categorySource: 'user' }, pending: undefined });
  });

  it('should_move_planned_entry_link_to_posted_when_pending_is_replaced', async () => {
    // Arrange: a decisão é só o vínculo com a previsão; a categoria da pendente é automática.
    await syncPending({ withUserCategory: false });
    const entryId = await linkPendingToPlannedEntry(await insertCategory(harness.database.db));
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    const posted = await findTransaction(harness.database, 'tx-posted');
    const [occurrence] = await harness.database.db
      .select()
      .from(plannedEntryOccurrences)
      .where(eq(plannedEntryOccurrences.plannedEntryId, entryId));
    expect(occurrence).toMatchObject({ status: 'realized', transactionId: posted?.id });
  });

  it('should_keep_posted_user_category_when_it_already_has_one', async () => {
    // Arrange: a postada chega junto com a pendente e o usuário escolhe outra categoria nela.
    await syncPending({ withUserCategory: true });
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    await runSync(harness.syncService);
    const postedCategoryId = await insertCategory(harness.database.db);
    await harness.database.db
      .update(transactions)
      .set({ categoryId: postedCategoryId, categorySource: 'user' })
      .where(eq(transactions.pluggyTransactionId, 'tx-posted'));
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      posted: await categoryOf('tx-posted'),
      pending: await findTransaction(harness.database, PENDING_ID),
    }).toEqual({
      posted: { categoryId: postedCategoryId, categorySource: 'user' },
      pending: undefined,
    });
  });

  it('should_keep_pending_and_carry_nothing_when_two_candidates_tie', async () => {
    // Arrange
    const categoryId = await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted-a', { date: '2026-11-11', status: 'POSTED' });
    addCardTransaction('tx-posted-b', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      pending: await categoryOf(PENDING_ID),
      postedA: (await categoryOf('tx-posted-a')).categorySource,
      postedB: (await categoryOf('tx-posted-b')).categorySource,
    }).toEqual({
      pending: { categoryId, categorySource: 'user' },
      postedA: expect.not.stringMatching('user'),
      postedB: expect.not.stringMatching('user'),
    });
  });

  it('should_log_only_counts_when_two_candidates_tie', async () => {
    // Arrange
    await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted-a', { date: '2026-11-11', status: 'POSTED' });
    addCardTransaction('tx-posted-b', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    const logLine = harness.logLines.find(
      (line) => line.msg === 'vanished pending decisions handled',
    );
    expect(logLine).toMatchObject({ carried: 0, kept: 1, ties: 1 });
  });

  it('should_choose_the_closest_date_when_two_candidates_differ', async () => {
    // Arrange
    const categoryId = await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted-near', { date: '2026-11-11', status: 'POSTED' });
    addCardTransaction('tx-posted-far', { date: '2026-11-13', status: 'POSTED' });
    syncOn('2026-11-13');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      near: await categoryOf('tx-posted-near'),
      far: (await categoryOf('tx-posted-far')).categorySource,
    }).toEqual({
      near: { categoryId, categorySource: 'user' },
      far: expect.not.stringMatching('user'),
    });
  });

  it('should_keep_categorized_pending_when_no_candidate_within_5_days', async () => {
    // Arrange
    const categoryId = await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await categoryOf(PENDING_ID)).toEqual({ categoryId, categorySource: 'user' });
  });

  it('should_carry_category_when_posted_arrives_after_pending_vanished', async () => {
    // Arrange: a pendente some em 12/11 e fica; a postada chega em 13/11.
    const categoryId = await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    await runSync(harness.syncService);
    addCardTransaction('tx-posted', { date: '2026-11-12', status: 'POSTED' });
    syncOn('2026-11-13');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      posted: await categoryOf('tx-posted'),
      pending: await findTransaction(harness.database, PENDING_ID),
    }).toEqual({ posted: { categoryId, categorySource: 'user' }, pending: undefined });
  });

  it('should_delete_categorized_pending_when_no_candidate_after_5_days', async () => {
    // Arrange
    await syncPending({ withUserCategory: true });
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-16');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, PENDING_ID)).toBeUndefined();
  });

  it('should_delete_pending_without_user_decision_right_away', async () => {
    // Arrange
    await syncPending({ withUserCategory: false });
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, PENDING_ID)).toBeUndefined();
  });

  it('should_not_touch_manual_transactions_when_replacing_pending', async () => {
    // Arrange: uma manual do mesmo valor e do mesmo dia, no mesmo cartão.
    await syncPending({ withUserCategory: true });
    const pending = await findTransaction(harness.database, PENDING_ID);
    if (!pending) throw new Error('Teste: pendente não foi sincronizada');
    const [manual] = await harness.database.db
      .insert(transactions)
      .values(
        transactionValues(pending.accountId, {
          source: 'manual',
          categorySource: 'user',
          amountCents: pending.amountCents,
          date: '2026-11-11',
        }),
      )
      .returning();
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    const [manualAfter] = await harness.database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, manual?.id ?? ''));
    expect(manualAfter).toEqual(manual);
  });

  it('should_not_learn_a_rule_nor_lose_the_category_when_carrying_it', async () => {
    // Arrange
    const categoryId = await syncPending({ withUserCategory: true });
    const rulesBefore = await harness.database.db.$count(categoryRules);
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
    await runSync(harness.syncService);
    syncOn('2026-11-12');
    // Act: a sincronização seguinte categoriza de novo o banco.
    await runSync(harness.syncService);
    // Assert
    expect({
      rules: await harness.database.db.$count(categoryRules),
      posted: await categoryOf('tx-posted'),
    }).toEqual({ rules: rulesBefore, posted: { categoryId, categorySource: 'user' } });
  });
});

describe('revisão na sincronização', () => {
  const REVIEWED_AT = new Date('2026-11-10T16:00:00.000Z');

  async function markPendingReviewed(): Promise<void> {
    await harness.database.db
      .update(transactions)
      .set({ reviewedAt: REVIEWED_AT })
      .where(eq(transactions.pluggyTransactionId, PENDING_ID));
  }

  async function reviewedAtOf(pluggyTransactionId: string): Promise<Date | null | undefined> {
    return (await findTransaction(harness.database, pluggyTransactionId))?.reviewedAt;
  }

  function replacePendingWithPosted(): void {
    withoutTransaction(card, PENDING_ID);
    addCardTransaction('tx-posted', { date: '2026-11-11', status: 'POSTED' });
    syncOn('2026-11-11');
  }

  it('should_insert_new_transactions_without_review', async () => {
    // Arrange
    addCardTransaction(PENDING_ID, { date: PENDING_DATE, status: 'PENDING' });
    syncOn(PENDING_DATE);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await reviewedAtOf(PENDING_ID)).toBeNull();
  });

  it('should_keep_the_review_when_the_sync_updates_an_existing_transaction', async () => {
    // Arrange
    await syncPending({ withUserCategory: false });
    await markPendingReviewed();
    const pending = card.transactions.find((transaction) => transaction.id === PENDING_ID);
    if (!pending) throw new Error('Teste: pendente não está nas fixtures');
    pending.description = 'Descrição corrigida pelo banco';
    syncOn('2026-11-11');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await reviewedAtOf(PENDING_ID)).toEqual(REVIEWED_AT);
  });

  it('should_carry_the_review_when_a_reviewed_pending_with_user_category_is_replaced', async () => {
    // Arrange
    await syncPending({ withUserCategory: true });
    await markPendingReviewed();
    replacePendingWithPosted();
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await reviewedAtOf('tx-posted')).toEqual(REVIEWED_AT);
  });

  it('should_carry_the_review_when_the_pending_was_only_reviewed', async () => {
    // Arrange: só "Ok", sem trocar a categoria.
    await syncPending({ withUserCategory: false });
    await markPendingReviewed();
    replacePendingWithPosted();
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      posted: await reviewedAtOf('tx-posted'),
      pending: await findTransaction(harness.database, PENDING_ID),
    }).toEqual({ posted: REVIEWED_AT, pending: undefined });
  });

  it('should_leave_the_posted_to_review_when_the_pending_was_not_reviewed', async () => {
    // Arrange
    await syncPending({ withUserCategory: true });
    await harness.database.db
      .update(transactions)
      .set({ reviewedAt: null })
      .where(eq(transactions.pluggyTransactionId, PENDING_ID));
    replacePendingWithPosted();
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await reviewedAtOf('tx-posted')).toBeNull();
  });

  it('should_keep_an_only_reviewed_pending_within_5_days_when_no_posted_arrives', async () => {
    // Arrange
    await syncPending({ withUserCategory: false });
    await markPendingReviewed();
    withoutTransaction(card, PENDING_ID);
    syncOn('2026-11-12');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await reviewedAtOf(PENDING_ID)).toEqual(REVIEWED_AT);
  });
});
