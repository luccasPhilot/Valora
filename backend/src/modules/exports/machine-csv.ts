// CSV de máquina (RFC 4180): vírgula, `\r\n`, aspas só quando precisa. Não é para abrir no Excel.
const SEPARATOR = ',';
const LINE_END = '\r\n';
const QUOTE = '"';
const NEEDS_QUOTES = /[",\r\n]/;

function quote(text: string): string {
  return `${QUOTE}${text.replaceAll(QUOTE, `${QUOTE}${QUOTE}`)}${QUOTE}`;
}

/**
 * Nulo vira campo vazio e o texto vazio vira `""`, para os dois não se confundirem. Instante vira
 * ISO 8601 em UTC, e coluna `jsonb` vira o JSON em texto.
 */
export function toCsvField(fieldValue: unknown): string {
  if (fieldValue === null || fieldValue === undefined) return '';
  if (fieldValue instanceof Date) return fieldValue.toISOString();
  if (typeof fieldValue === 'object') return quote(JSON.stringify(fieldValue));
  const text = String(fieldValue);
  return text === '' || NEEDS_QUOTES.test(text) ? quote(text) : text;
}

export function toMachineCsv(
  columnNames: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [
    columnNames.join(SEPARATOR),
    ...rows.map((row) => row.map(toCsvField).join(SEPARATOR)),
  ];
  return lines.map((line) => `${line}${LINE_END}`).join('');
}
