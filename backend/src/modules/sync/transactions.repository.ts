import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { transactions } from '../../db/schema.js';
import type { SyncedTransaction, TransactionWindow } from './sync.types.js';

// Bem abaixo do limite de parâmetros do PostgreSQL (65535) com ~12 colunas por linha.
const UPSERT_BATCH_SIZE = 500;

export interface UpsertCounts {
  readonly inserted: number;
  readonly updated: number;
}

// Só conta como "atualizada" a linha em que algum destes campos mudou.
const HAS_CHANGED = sql`(
  ${transactions.date}, ${transactions.description}, ${transactions.descriptionNormalized},
  ${transactions.amountCents}, ${transactions.status}, ${transactions.pluggyCategory},
  ${transactions.installmentNumber}, ${transactions.installmentTotal}, ${transactions.raw}
) is distinct from (
  excluded.date, excluded.description, excluded.description_normalized,
  excluded.amount_cents, excluded.status, excluded.pluggy_category,
  excluded.installment_number, excluded.installment_total, excluded.raw
)`;

export class TransactionsRepository {
  constructor(private readonly db: DbExecutor) {}

  /**
   * Grava ou atualiza pelo id do Pluggy. Nunca mexe em `category_id`, `category_source` nem
   * `possible_duplicate_of_id`: a categoria escolhida por você não é sobrescrita.
   */
  async upsertMany(
    accountId: string,
    syncedTransactions: readonly SyncedTransaction[],
  ): Promise<UpsertCounts> {
    // O mesmo id duas vezes num INSERT ... ON CONFLICT derruba o comando inteiro: fica a última.
    const uniqueTransactions = [
      ...new Map(syncedTransactions.map((tx) => [tx.pluggyTransactionId, tx])).values(),
    ];
    let inserted = 0;
    let updated = 0;
    for (let start = 0; start < uniqueTransactions.length; start += UPSERT_BATCH_SIZE) {
      const batch = uniqueTransactions.slice(start, start + UPSERT_BATCH_SIZE);
      const rows = await this.upsertBatch(accountId, batch);
      const insertedInBatch = rows.filter((row) => row.isInserted).length;
      inserted += insertedInBatch;
      updated += rows.length - insertedInBatch;
    }
    return { inserted, updated };
  }

  /**
   * Apaga as pendentes do Open Finance da conta, dentro da janela, cujo id não voltou do Pluggy.
   * O filtro `source = 'open_finance'` é o que protege as transações manuais.
   */
  async deleteMissingPending(
    accountId: string,
    window: TransactionWindow,
    returnedPluggyIds: readonly string[],
  ): Promise<number> {
    const deleted = await this.db
      .delete(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.source, 'open_finance'),
          eq(transactions.status, 'pending'),
          gte(transactions.date, window.from),
          lte(transactions.date, window.to),
          sql`${transactions.pluggyTransactionId} <> all(${sql.param([...returnedPluggyIds])}::text[])`,
        ),
      )
      .returning({ id: transactions.id });
    return deleted.length;
  }

  private async upsertBatch(accountId: string, batch: readonly SyncedTransaction[]) {
    return (
      this.db
        .insert(transactions)
        .values(batch.map((transaction) => ({ accountId, source: 'open_finance', ...transaction })))
        .onConflictDoUpdate({
          target: transactions.pluggyTransactionId,
          targetWhere: isNotNull(transactions.pluggyTransactionId),
          set: {
            date: sql`excluded.date`,
            description: sql`excluded.description`,
            descriptionNormalized: sql`excluded.description_normalized`,
            amountCents: sql`excluded.amount_cents`,
            status: sql`excluded.status`,
            pluggyCategory: sql`excluded.pluggy_category`,
            installmentNumber: sql`excluded.installment_number`,
            installmentTotal: sql`excluded.installment_total`,
            raw: sql`excluded.raw`,
            updatedAt: sql`now()`,
          },
          setWhere: HAS_CHANGED,
        })
        // `xmax = 0` só na linha recém-inserida; na atualizada, xmax guarda a transação que a mudou.
        .returning({ isInserted: sql<boolean>`(xmax = 0)` })
    );
  }
}
