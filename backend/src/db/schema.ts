import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Dinheiro: sempre centavos inteiros (`*_cents`). `mode: 'number'` é seguro porque o schema Zod
// de escrita (shared/money.ts) recusa o que passa do inteiro seguro do JavaScript.
const cents = (columnName: string) => bigint(columnName, { mode: 'number' });

// Datas de dia (sem hora) trafegam como texto AAAA-MM-DD, sem conversão de fuso.
const day = (columnName: string) => date(columnName, { mode: 'string' });

const timestamptz = (columnName: string) => timestamp(columnName, { withTimezone: true });

const primaryId = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`);

export const connections = pgTable(
  'connections',
  {
    id: primaryId(),
    pluggyItemId: text('pluggy_item_id').notNull().unique(),
    institutionName: text('institution_name').notNull(),
    institutionLogoUrl: text('institution_logo_url'),
    status: text('status').notNull().default('ok'),
    statusDetail: text('status_detail'),
    lastSyncedAt: timestamptz('last_synced_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'connections_status_check',
      sql`${table.status} in ('ok', 'syncing', 'error', 'consent_expired')`,
    ),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: primaryId(),
    connectionId: uuid('connection_id').references(() => connections.id),
    pluggyAccountId: text('pluggy_account_id'),
    type: text('type').notNull(),
    name: text('name').notNull(),
    numberLastDigits: text('number_last_digits'),
    balanceCents: cents('balance_cents'),
    creditLimitCents: cents('credit_limit_cents'),
    availableLimitCents: cents('available_limit_cents'),
    isHidden: boolean('is_hidden').notNull().default(false),
    raw: jsonb('raw'),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Parcial: a conta "Dinheiro" não tem id do Pluggy, e nulos não podem colidir.
    uniqueIndex('accounts_pluggy_account_id_key')
      .on(table.pluggyAccountId)
      .where(sql`${table.pluggyAccountId} is not null`),
    // A conta "Dinheiro" é única: o banco recusa uma segunda conta `cash`.
    uniqueIndex('accounts_single_cash_key')
      .on(table.type)
      .where(sql`${table.type} = 'cash'`),
    check(
      'accounts_type_check',
      sql`${table.type} in ('checking', 'savings', 'credit_card', 'cash')`,
    ),
  ],
);

export const balanceSnapshots = pgTable(
  'balance_snapshots',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    date: day('date').notNull(),
    balanceCents: cents('balance_cents').notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.date] })],
);

export const categories = pgTable(
  'categories',
  {
    id: primaryId(),
    // Chave estável das categorias padrão: o seed procura por ela, não pelo nome (que você pode mudar).
    seedKey: text('seed_key').unique(),
    name: text('name').notNull().unique(),
    kind: text('kind').notNull(),
    icon: text('icon').notNull(),
    isArchived: boolean('is_archived').notNull().default(false),
  },
  (table) => [
    check('categories_kind_check', sql`${table.kind} in ('expense', 'income', 'transfer')`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: primaryId(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    pluggyTransactionId: text('pluggy_transaction_id'),
    source: text('source').notNull(),
    date: day('date').notNull(),
    description: text('description').notNull(),
    descriptionNormalized: text('description_normalized').notNull(),
    amountCents: cents('amount_cents').notNull(),
    status: text('status').notNull(),
    pluggyCategory: text('pluggy_category'),
    categoryId: uuid('category_id').references(() => categories.id),
    categorySource: text('category_source').notNull().default('none'),
    installmentNumber: integer('installment_number'),
    installmentTotal: integer('installment_total'),
    possibleDuplicateOfId: uuid('possible_duplicate_of_id').references(
      (): AnyPgColumn => transactions.id,
      { onDelete: 'set null' },
    ),
    raw: jsonb('raw'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transactions_pluggy_transaction_id_key')
      .on(table.pluggyTransactionId)
      .where(sql`${table.pluggyTransactionId} is not null`),
    index('transactions_account_id_date_idx').on(table.accountId, table.date),
    index('transactions_category_id_date_idx').on(table.categoryId, table.date),
    index('transactions_date_idx').on(table.date),
    index('transactions_source_idx').on(table.source),
    check('transactions_source_check', sql`${table.source} in ('open_finance', 'manual')`),
    check('transactions_status_check', sql`${table.status} in ('pending', 'posted')`),
    check(
      'transactions_category_source_check',
      sql`${table.categorySource} in ('user', 'rule', 'pluggy', 'none')`,
    ),
  ],
);

export const categoryRules = pgTable(
  'category_rules',
  {
    id: primaryId(),
    pattern: text('pattern').notNull(),
    matchType: text('match_type').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    priority: integer('priority').notNull().default(0),
    learnedFromTransactionId: uuid('learned_from_transaction_id').references(
      () => transactions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'category_rules_match_type_check',
      sql`${table.matchType} in ('contains', 'starts_with', 'equals')`,
    ),
  ],
);

export const pluggyCategoryMappings = pgTable('pluggy_category_mappings', {
  pluggyCategory: text('pluggy_category').primaryKey(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
});

export const budgets = pgTable(
  'budgets',
  {
    id: primaryId(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    month: day('month').notNull(),
    limitCents: cents('limit_cents').notNull(),
  },
  (table) => [
    unique('budgets_category_id_month_key').on(table.categoryId, table.month),
    check('budgets_month_first_day_check', sql`extract(day from ${table.month}) = 1`),
  ],
);

export const investments = pgTable('investments', {
  id: primaryId(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => connections.id),
  pluggyInvestmentId: text('pluggy_investment_id').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  balanceCents: cents('balance_cents').notNull(),
  raw: jsonb('raw'),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const investmentSnapshots = pgTable(
  'investment_snapshots',
  {
    investmentId: uuid('investment_id')
      .notNull()
      .references(() => investments.id, { onDelete: 'cascade' }),
    date: day('date').notNull(),
    balanceCents: cents('balance_cents').notNull(),
  },
  (table) => [primaryKey({ columns: [table.investmentId, table.date] })],
);

export const creditCardBills = pgTable(
  'credit_card_bills',
  {
    id: primaryId(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    pluggyBillId: text('pluggy_bill_id').notNull().unique(),
    dueDate: day('due_date').notNull(),
    closingDate: day('closing_date'),
    totalCents: cents('total_cents').notNull(),
    paidCents: cents('paid_cents').notNull().default(0),
    minimumPaymentCents: cents('minimum_payment_cents'),
    raw: jsonb('raw'),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('credit_card_bills_account_id_due_date_idx').on(table.accountId, table.dueDate),
  ],
);

export const syncRuns = pgTable(
  'sync_runs',
  {
    id: primaryId(),
    trigger: text('trigger').notNull(),
    status: text('status').notNull().default('running'),
    startedAt: timestamptz('started_at').notNull().defaultNow(),
    finishedAt: timestamptz('finished_at'),
    stats: jsonb('stats'),
    errorMessage: text('error_message'),
  },
  (table) => [
    check('sync_runs_trigger_check', sql`${table.trigger} in ('schedule', 'manual')`),
    check(
      'sync_runs_status_check',
      sql`${table.status} in ('running', 'success', 'partial', 'failed')`,
    ),
  ],
);
