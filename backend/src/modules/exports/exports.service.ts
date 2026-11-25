import { strToU8, zipSync } from 'fflate';

import { todayInSaoPaulo } from '../../shared/dates.js';
import type { ExportsRepository, TableDump } from './exports.repository.js';
import { EXPORT_README } from './exports-readme.js';
import { toMachineCsv } from './machine-csv.js';

const README_FILE_NAME = 'LEIA-ME.txt';

export interface DataExport {
  /** `valora-dados-2026-11-24.zip`, com o dia em São Paulo. */
  readonly fileName: string;
  readonly content: Uint8Array;
  /** Linhas por tabela: o único detalhe da exportação que pode ir para o log. */
  readonly rowCounts: Readonly<Record<string, number>>;
}

interface ExportsServiceDependencies {
  readonly repository: ExportsRepository;
  readonly now: () => Date;
}

function toZipEntry({ tableName, columnNames, rows }: TableDump): [string, Uint8Array] {
  return [`${tableName}.csv`, strToU8(toMachineCsv(columnNames, rows))];
}

export class ExportsService {
  constructor(private readonly deps: ExportsServiceDependencies) {}

  /**
   * "Baixar meus dados": um CSV por tabela e o LEIA-ME, num `.zip` montado em memória. Com um
   * usuário os dados ficam em poucos MB; passando de 50 MB, vale trocar para o modo de streaming.
   */
  async exportAll(): Promise<DataExport> {
    const dumps = await this.deps.repository.readAllTables();
    const content = zipSync({
      ...Object.fromEntries(dumps.map(toZipEntry)),
      [README_FILE_NAME]: strToU8(EXPORT_README),
    });
    return {
      fileName: `valora-dados-${todayInSaoPaulo(this.deps.now())}.zip`,
      content,
      rowCounts: Object.fromEntries(dumps.map((dump) => [dump.tableName, dump.rows.length])),
    };
  }
}
