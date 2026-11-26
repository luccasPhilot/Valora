import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

import type { Db, DbExecutor } from '../../db/database.js';
import * as schema from '../../db/schema.js';

/** O JSON bruto do Pluggy fica de fora: é grande, muda de formato e não é dado do Valora. */
const EXCLUDED_COLUMN = 'raw';

/**
 * As inscrições de push guardam o endereço do aparelho no serviço de push e as chaves da inscrição:
 * são credenciais de envio, não dado do usuário, e não servem para reprocessar nada.
 */
const EXCLUDED_TABLES: readonly PgTable[] = [schema.pushSubscriptions];

// Toda tabela do schema entra, menos as excluídas: uma tabela nova vai para o `.zip` sem mudar este
// arquivo.
const SCHEMA_EXPORTS: readonly unknown[] = Object.values(schema);
const EXPORTED_TABLES: readonly PgTable[] = SCHEMA_EXPORTS.filter(
  (exported): exported is PgTable => is(exported, PgTable) && !EXCLUDED_TABLES.includes(exported),
);

export interface TableDump {
  readonly tableName: string;
  /** Os nomes das colunas no banco (`amount_cents`), na ordem do schema. */
  readonly columnNames: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
}

async function readTable(executor: DbExecutor, table: PgTable): Promise<TableDump> {
  const columns = Object.values(getTableColumns(table)).filter(
    (column) => column.name !== EXCLUDED_COLUMN,
  );
  const selection = Object.fromEntries(columns.map((column) => [column.name, column]));
  const records = await executor.select(selection).from(table);
  return {
    tableName: getTableName(table),
    columnNames: columns.map((column) => column.name),
    rows: records.map((record) => columns.map((column) => record[column.name])),
  };
}

export class ExportsRepository {
  constructor(private readonly db: Db) {}

  /**
   * Todas as tabelas numa transação `repeatable read` só de leitura: uma foto só do banco, mesmo
   * com a sincronização gravando no meio (nenhuma transação aponta para uma conta que não veio).
   */
  async readAllTables(): Promise<TableDump[]> {
    return this.db.transaction(
      async (tx) => {
        const dumps: TableDump[] = [];
        for (const table of EXPORTED_TABLES) dumps.push(await readTable(tx, table));
        return dumps;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
