import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { strFromU8, unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '../../src/db/schema.js';
import { syncRuns, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertAccountSnapshot,
  insertAccountWith,
  insertConnection,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const EXPORT_URL = '/api/v1/exports/all.zip';
// 24/11/2026 às 10:00 em São Paulo.
const NOW = new Date('2026-11-24T13:00:00Z');
const README_FILE = 'LEIA-ME.txt';
const PHARMACY = 'FARMÁCIA SÃO JOÃO';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
});

afterEach(async () => {
  await testApp.app.close();
});

async function downloadExport() {
  const response = await testApp.app.inject({ method: 'GET', url: EXPORT_URL });
  const entries = unzipSync(new Uint8Array(response.rawPayload));
  const files = Object.fromEntries(
    Object.entries(entries).map(([fileName, bytes]) => [fileName, strFromU8(bytes)]),
  );
  return { response, files };
}

/** As linhas do CSV, cada uma como objeto pela coluna (só para linhas sem vírgula entre aspas). */
function csvRows(csv: string | undefined): Record<string, string>[] {
  const [header = '', ...lines] = (csv ?? '').split('\r\n').filter((line) => line !== '');
  const columns = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

function csvHeader(csv: string | undefined): string[] {
  return (csv ?? '').split('\r\n')[0]?.split(',') ?? [];
}

async function seedPharmacyPurchase(): Promise<string> {
  const connectionId = await insertConnection(database.db, { institutionName: 'Nubank' });
  const accountId = await insertAccountWith(database.db, {
    connectionId,
    name: 'Conta corrente',
    balanceCents: 300_000,
    raw: { secret: 'raw-account' },
  });
  await database.db.insert(transactions).values(
    transactionValues(accountId, {
      description: PHARMACY,
      descriptionNormalized: 'FARMACIA SAO JOAO',
      amountCents: -8990,
      date: '2026-11-03',
      raw: { secret: 'raw-transaction' },
    }),
  );
  await insertAccountSnapshot(database.db, accountId, '2026-11-03', 300_000);
  return accountId;
}

const SCHEMA_EXPORTS: readonly unknown[] = Object.values(schema);
const ALL_TABLE_NAMES = SCHEMA_EXPORTS.filter((exported) => is(exported, PgTable)).map((table) =>
  getTableName(table),
);

describe('GET /api/v1/exports/all.zip', () => {
  it('should_answer_a_zip_attachment_named_with_the_day_when_downloading', async () => {
    // Arrange / Act
    const { response } = await downloadExport();
    // Assert
    expect({
      status: response.statusCode,
      contentType: response.headers['content-type'],
      contentDisposition: response.headers['content-disposition'],
    }).toEqual({
      status: 200,
      contentType: 'application/zip',
      contentDisposition: 'attachment; filename="valora-dados-2026-11-24.zip"',
    });
  });

  it('should_have_one_csv_per_table_and_the_readme_when_downloading', async () => {
    // Arrange / Act
    const { files } = await downloadExport();
    // Assert
    expect(Object.keys(files).sort()).toEqual(
      [...ALL_TABLE_NAMES.map((name) => `${name}.csv`), README_FILE].sort(),
    );
  });

  it('should_keep_the_header_when_a_table_is_empty', async () => {
    // Arrange / Act
    const { files } = await downloadExport();
    // Assert
    expect(files['goals.csv']?.split('\r\n')[0]).toContain('target_cents');
  });

  it('should_leave_the_raw_column_out_of_every_csv_when_tables_have_it', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    const { files } = await downloadExport();
    // Assert
    const headersWithRaw = Object.entries(files)
      .filter(([fileName]) => fileName.endsWith('.csv'))
      .filter(([, csv]) => csvHeader(csv).includes('raw'));
    expect(headersWithRaw).toEqual([]);
  });

  it('should_not_carry_the_raw_content_when_tables_have_it', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    const { files } = await downloadExport();
    // Assert
    expect(JSON.stringify(files)).not.toContain('raw-transaction');
  });

  it('should_write_the_amount_in_integer_cents_when_there_is_a_purchase', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    const { files } = await downloadExport();
    // Assert
    expect(csvRows(files['transactions.csv'])[0]).toMatchObject({
      description: PHARMACY,
      amount_cents: '-8990',
    });
  });

  it('should_write_days_as_iso_dates_and_instants_in_utc_when_exporting', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    const { files } = await downloadExport();
    // Assert
    expect(csvRows(files['transactions.csv'])[0]).toMatchObject({
      date: '2026-11-03',
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
  });

  it('should_point_every_transaction_to_an_exported_account_when_exporting', async () => {
    // Arrange
    const accountId = await seedPharmacyPurchase();
    // Act
    const { files } = await downloadExport();
    // Assert
    expect({
      accounts: csvRows(files['accounts.csv']).map((row) => row.id),
      transactionAccounts: csvRows(files['transactions.csv']).map((row) => row.account_id),
    }).toEqual({ accounts: [accountId], transactionAccounts: [accountId] });
  });

  it('should_quote_and_double_inner_quotes_when_a_text_has_commas_and_quotes', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db, { name: 'Conta corrente' });
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { description: 'LOJA "A, B"' }));
    // Act
    const { files } = await downloadExport();
    // Assert
    expect(files['transactions.csv']).toContain(',"LOJA ""A, B""",');
  });

  it('should_write_json_columns_as_json_text_when_a_sync_run_has_stats', async () => {
    // Arrange
    await database.db
      .insert(syncRuns)
      .values({ trigger: 'manual', status: 'success', stats: { transactions: 3 } });
    // Act
    const { files } = await downloadExport();
    // Assert
    expect(files['sync_runs.csv']).toContain('"{""transactions"":3}"');
  });

  it('should_explain_cents_in_the_readme_when_downloading', async () => {
    // Arrange / Act
    const { files } = await downloadExport();
    // Assert
    expect(files[README_FILE]).toContain('centavos');
  });

  it('should_log_only_the_row_counts_when_the_export_is_created', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    await downloadExport();
    // Assert
    const exportLog = testApp.logLines.find((line) => line.msg === 'exports created');
    expect(exportLog?.rowCounts).toMatchObject({
      transactions: 1,
      accounts: 1,
      balance_snapshots: 1,
    });
  });

  it('should_keep_values_and_descriptions_out_of_the_logs_when_exporting', async () => {
    // Arrange
    await seedPharmacyPurchase();
    // Act
    await downloadExport();
    // Assert
    const serializedLogs = JSON.stringify(testApp.logLines);
    expect([serializedLogs.includes(PHARMACY), serializedLogs.includes('8990')]).toEqual([
      false,
      false,
    ]);
  });
});
