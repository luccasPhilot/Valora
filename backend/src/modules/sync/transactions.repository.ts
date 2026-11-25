import { and, asc, eq, gte, isNotNull, isNull, lte, ne, type SQL, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { plannedEntryOccurrences, transactions } from '../../db/schema.js';
import type { ReplacementTransaction } from './pending-replacement.js';
import type { SyncedTransaction, TransactionWindow } from './sync.types.js';

// Bem abaixo do limite de parâmetros do PostgreSQL (65535) com ~12 colunas por linha.
const UPSERT_BATCH_SIZE = 500;

export interface UpsertCounts {
  readonly inserted: number;
  readonly updated: number;
  /** Ids internos só das linhas novas: é o que a detecção de duplicatas examina. */
  readonly insertedIds: readonly string[];
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

/** Pendente que sumiu com decisão do usuário: o que a troca compara e o que ela leva. */
export interface VanishedPending extends ReplacementTransaction {
  /** Nula quando a decisão não inclui a categoria (só a previsão ou a revisão). */
  readonly userCategoryId: string | null;
  /** Nula quando a pendente ainda estava para revisar. */
  readonly reviewedAt: Date | null;
}

/** Pendentes que sumiram: pendentes do Open Finance da conta, na janela, com id que não voltou. */
export interface VanishedPendingScope {
  readonly accountId: string;
  readonly window: TransactionWindow;
  readonly returnedPluggyIds: readonly string[];
}

function vanishedPendingFilter({
  accountId,
  window,
  returnedPluggyIds,
}: VanishedPendingScope): SQL | undefined {
  return and(
    eq(transactions.accountId, accountId),
    eq(transactions.source, 'open_finance'),
    eq(transactions.status, 'pending'),
    gte(transactions.date, window.from),
    lte(transactions.date, window.to),
    sql`${transactions.pluggyTransactionId} <> all(${sql.param([...returnedPluggyIds])}::text[])`,
  );
}

const REPLACEMENT_COLUMNS = {
  id: transactions.id,
  date: transactions.date,
  amountCents: transactions.amountCents,
  createdAt: transactions.createdAt,
};

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
    const insertedIds: string[] = [];
    let updated = 0;
    for (let start = 0; start < uniqueTransactions.length; start += UPSERT_BATCH_SIZE) {
      const batch = uniqueTransactions.slice(start, start + UPSERT_BATCH_SIZE);
      const rows = await this.upsertBatch(accountId, batch);
      const insertedInBatch = rows.filter((row) => row.isInserted);
      insertedIds.push(...insertedInBatch.map((row) => row.id));
      updated += rows.length - insertedInBatch.length;
    }
    return { inserted: insertedIds.length, updated, insertedIds };
  }

  /** Pendentes que sumiram com categoria escolhida pelo usuário, previsão vinculada ou revisão. */
  async findVanishedPendingWithDecision(scope: VanishedPendingScope): Promise<VanishedPending[]> {
    const isUserCategory = eq(transactions.categorySource, 'user');
    const isReviewed = isNotNull(transactions.reviewedAt);
    const hasOccurrence = sql`exists (
      select 1 from ${plannedEntryOccurrences}
      where ${plannedEntryOccurrences.transactionId} = ${transactions.id}
    )`;
    const rows = await this.db
      .select({
        ...REPLACEMENT_COLUMNS,
        categoryId: transactions.categoryId,
        categorySource: transactions.categorySource,
        reviewedAt: transactions.reviewedAt,
      })
      .from(transactions)
      .where(
        and(
          vanishedPendingFilter(scope),
          sql`(${isUserCategory} or ${hasOccurrence} or ${isReviewed})`,
        ),
      );
    return rows.map(({ categoryId, categorySource, ...row }) => ({
      ...row,
      userCategoryId: categorySource === 'user' ? categoryId : null,
    }));
  }

  /** Postadas do Open Finance da conta no intervalo: as que podem ter substituído uma pendente. */
  async findPostedInRange(
    accountId: string,
    range: TransactionWindow,
  ): Promise<ReplacementTransaction[]> {
    return this.db
      .select(REPLACEMENT_COLUMNS)
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.source, 'open_finance'),
          eq(transactions.status, 'posted'),
          gte(transactions.date, range.from),
          lte(transactions.date, range.to),
        ),
      )
      .orderBy(asc(transactions.date), asc(transactions.id));
  }

  /** Leva a categoria do usuário para a postada, a menos que ela já tenha uma escolhida por ele. */
  async carryUserCategory(postedId: string, categoryId: string): Promise<void> {
    await this.db
      .update(transactions)
      .set({ categoryId, categorySource: 'user', updatedAt: sql`now()` })
      .where(and(eq(transactions.id, postedId), ne(transactions.categorySource, 'user')));
  }

  /** Leva a revisão da pendente para a postada, a menos que ela já tenha sido revisada. */
  async carryReview(postedId: string, reviewedAt: Date): Promise<void> {
    await this.db
      .update(transactions)
      .set({ reviewedAt, updatedAt: sql`now()` })
      .where(and(eq(transactions.id, postedId), isNull(transactions.reviewedAt)));
  }

  /**
   * Passa o vínculo da ocorrência de previsão da pendente para a postada. Se a postada já realiza
   * outra ocorrência, nada muda aqui e o vínculo vira nulo quando a pendente for apagada.
   */
  async moveOccurrenceLink(pendingId: string, postedId: string): Promise<void> {
    await this.db
      .update(plannedEntryOccurrences)
      .set({ transactionId: postedId })
      .where(
        and(
          eq(plannedEntryOccurrences.transactionId, pendingId),
          sql`not exists (
            select 1 from ${plannedEntryOccurrences} as taken
            where taken.transaction_id = ${postedId}
          )`,
        ),
      );
  }

  /**
   * Apaga as pendentes que sumiram, menos as que ainda esperam pela postada (`keptIds`).
   * O filtro `source = 'open_finance'` é o que protege as transações manuais.
   */
  async deleteMissingPending(
    scope: VanishedPendingScope,
    keptIds: readonly string[],
  ): Promise<number> {
    const deleted = await this.db
      .delete(transactions)
      .where(
        and(
          vanishedPendingFilter(scope),
          sql`${transactions.id} <> all(${sql.param([...keptIds])}::uuid[])`,
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
        .returning({ id: transactions.id, isInserted: sql<boolean>`(xmax = 0)` })
    );
  }
}
