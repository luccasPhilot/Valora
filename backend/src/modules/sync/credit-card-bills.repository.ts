import { sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { creditCardBills } from '../../db/schema.js';
import type { SyncedCreditCardBill } from './sync.types.js';

export class CreditCardBillsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Grava ou atualiza pelo id do Pluggy: sincronizar de novo atualiza a fatura, não a duplica. */
  async upsertMany(accountId: string, bills: readonly SyncedCreditCardBill[]): Promise<number> {
    if (bills.length === 0) return 0;
    // O mesmo id duas vezes num INSERT ... ON CONFLICT derruba o comando inteiro: fica a última.
    const uniqueBills = [...new Map(bills.map((bill) => [bill.pluggyBillId, bill])).values()];
    const rows = await this.db
      .insert(creditCardBills)
      .values(uniqueBills.map((bill) => ({ accountId, ...bill })))
      .onConflictDoUpdate({
        target: creditCardBills.pluggyBillId,
        // `account_id` não muda: a fatura continua sendo do mesmo cartão.
        set: {
          dueDate: sql`excluded.due_date`,
          closingDate: sql`excluded.closing_date`,
          totalCents: sql`excluded.total_cents`,
          paidCents: sql`excluded.paid_cents`,
          minimumPaymentCents: sql`excluded.minimum_payment_cents`,
          raw: sql`excluded.raw`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: creditCardBills.id });
    return rows.length;
  }
}
