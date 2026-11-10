import { and, asc, eq, gt, gte, inArray, lt, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { accounts, connections, creditCardBills, transactions } from '../../db/schema.js';
import { accountIsOfActiveConnection } from '../connections/active-connection.js';
import type { StoredBill } from './bill-selection.js';
import type { InstallmentTransaction } from './installment-projection.js';

const DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const DATE_LENGTH = 10;

export interface CardRecord {
  readonly id: string;
  readonly name: string;
  readonly lastDigits: string | null;
  readonly institutionName: string | null;
  /** O valor da fatura atual. */
  readonly balanceCents: number | null;
  /** `creditData.balanceDueDate` dos dados da conta, em AAAA-MM-DD. Costuma estar velho ou nulo. */
  readonly accountDueDate: string | null;
}

export interface CardBill extends StoredBill {
  readonly accountId: string;
}

export interface CardInstallment extends InstallmentTransaction {
  readonly accountId: string;
}

// O Pluggy manda a data como texto ISO, com ou sem hora (`2026-10-10` ou `2026-10-10T00:00:00.000Z`).
// É data de calendário: vale o dia escrito, sem converter de fuso.
function toDueDate(value: string | null): string | null {
  if (value === null) return null;
  return DATE_PREFIX_PATTERN.test(value) ? value.slice(0, DATE_LENGTH) : null;
}

export class CreditCardBillsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Cartões não ocultos, de bancos ativos. O `raw` fica aqui dentro: só o vencimento sai dele. */
  async findVisibleCards(): Promise<CardRecord[]> {
    const rows = await this.db
      .select({
        id: accounts.id,
        name: accounts.name,
        lastDigits: accounts.numberLastDigits,
        institutionName: connections.institutionName,
        balanceCents: accounts.balanceCents,
        rawDueDate: sql<string | null>`${accounts.raw} #>> '{creditData,balanceDueDate}'`,
      })
      .from(accounts)
      .leftJoin(connections, eq(connections.id, accounts.connectionId))
      .where(
        and(
          eq(accounts.type, 'credit_card'),
          eq(accounts.isHidden, false),
          accountIsOfActiveConnection,
        ),
      )
      .orderBy(asc(connections.institutionName), asc(accounts.name));
    return rows.map(({ rawDueDate, ...card }) => ({
      ...card,
      accountDueDate: toDueDate(rawDueDate),
    }));
  }

  async findBills(accountIds: readonly string[]): Promise<CardBill[]> {
    if (accountIds.length === 0) return [];
    return this.db
      .select({
        accountId: creditCardBills.accountId,
        id: creditCardBills.id,
        dueDate: creditCardBills.dueDate,
        closingDate: creditCardBills.closingDate,
        totalCents: creditCardBills.totalCents,
        paidCents: creditCardBills.paidCents,
      })
      .from(creditCardBills)
      .where(inArray(creditCardBills.accountId, accountIds))
      .orderBy(asc(creditCardBills.dueDate));
  }

  /** Compras parceladas dos cartões desde `fromDate`: só as saídas, que é o que gera parcela futura. */
  async findInstallments(
    accountIds: readonly string[],
    fromDate: string,
  ): Promise<CardInstallment[]> {
    if (accountIds.length === 0) return [];
    const rows = await this.db
      .select({
        accountId: transactions.accountId,
        descriptionNormalized: transactions.descriptionNormalized,
        date: transactions.date,
        amountCents: transactions.amountCents,
        installmentNumber: transactions.installmentNumber,
        installmentTotal: transactions.installmentTotal,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gt(transactions.installmentTotal, 1),
          lt(transactions.amountCents, 0),
          gte(transactions.date, fromDate),
        ),
      );
    return rows.flatMap(({ installmentNumber, installmentTotal, ...row }) =>
      installmentNumber === null || installmentTotal === null
        ? []
        : [{ ...row, installmentNumber, installmentTotal }],
    );
  }
}
