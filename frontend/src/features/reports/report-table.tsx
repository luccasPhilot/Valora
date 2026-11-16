import type { ReactNode } from 'react';

export interface ReportTableRow {
  readonly key: string;
  /** Cabeçalho da linha (o mês). */
  readonly header: ReactNode;
  /** Uma célula por coluna de valor, na ordem de `columns`. */
  readonly cells: readonly ReactNode[];
}

interface ReportTableProps {
  /** Descreve o relatório e o período; o leitor de tela lê antes da tabela. */
  caption: string;
  /** Nome da coluna de cabeçalhos de linha, como "Mês". */
  rowHeaderLabel: string;
  columns: readonly string[];
  rows: readonly ReportTableRow[];
  /** Linha de total no fim; sem ela, a tabela termina na última linha (ex.: patrimônio, que não se soma). */
  total?: Omit<ReportTableRow, 'key'>;
}

// Abaixo de `sm` as colunas não cabem lado a lado: cada mês vira um bloco, com o nome da coluna
// (`data-label`) à esquerda de cada valor. Os `role` mantêm a semântica de tabela, que alguns
// leitores de tela perdem quando o CSS troca o `display` dos elementos.
const CELL_CLASSES = [
  'px-3 py-3 text-right text-sm whitespace-nowrap tabular-nums',
  'max-sm:flex max-sm:justify-between max-sm:gap-3 max-sm:px-0 max-sm:py-1',
  // O nome da coluna pode ser longo (categoria): quebra de linha; o valor nunca quebra.
  'max-sm:before:min-w-0 max-sm:before:text-left max-sm:before:font-normal max-sm:before:whitespace-normal max-sm:before:text-muted-foreground',
  'max-sm:*:shrink-0',
  'max-sm:before:content-[attr(data-label)]',
].join(' ');
const ROW_HEADER_CLASSES = [
  'sticky left-0 z-[1] bg-card px-3 py-3 text-left text-sm font-medium whitespace-nowrap',
  'max-sm:static max-sm:block max-sm:px-0 max-sm:pt-0 max-sm:pb-1',
].join(' ');
const ROW_CLASSES = 'max-sm:block max-sm:px-3 max-sm:py-3';

/**
 * Tabela dos relatórios (a opção "Ver em tabela"). No celular cada mês é um bloco, sem rolagem
 * lateral; a partir de `sm`, se faltar largura, rola só dentro do próprio bloco, com a coluna do
 * mês fixa. A página nunca ganha rolagem horizontal.
 */
export function ReportTable({ caption, rowHeaderLabel, columns, rows, total }: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table role="table" className="w-full border-collapse max-sm:block">
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row" className="border-b">
            <th role="columnheader" scope="col" className={`${ROW_HEADER_CLASSES} type-label`}>
              {rowHeaderLabel}
            </th>
            {columns.map((column, columnIndex) => (
              <th
                // O nome pode repetir (uma categoria chamada "Outros"): a posição desempata.
                key={`${column}-${columnIndex}`}
                role="columnheader"
                scope="col"
                title={column}
                className={`${CELL_CLASSES} type-label`}
              >
                <span className="block max-w-40 truncate">{column}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="divide-y max-sm:block">
          {rows.map((row) => (
            <tr key={row.key} role="row" className={ROW_CLASSES}>
              <th role="rowheader" scope="row" className={ROW_HEADER_CLASSES}>
                {row.header}
              </th>
              {row.cells.map((cell, columnIndex) => (
                <td
                  key={`${columns[columnIndex]}-${columnIndex}`}
                  role="cell"
                  data-label={columns[columnIndex]}
                  className={CELL_CLASSES}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {total ? (
          <tfoot role="rowgroup" className="max-sm:block">
            <tr role="row" className={`border-t-2 font-bold ${ROW_CLASSES}`}>
              <th role="rowheader" scope="row" className={ROW_HEADER_CLASSES}>
                {total.header}
              </th>
              {total.cells.map((cell, columnIndex) => (
                <td
                  key={`${columns[columnIndex]}-${columnIndex}`}
                  role="cell"
                  data-label={columns[columnIndex]}
                  className={`${CELL_CLASSES} font-bold`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
