/** Uma transação como os detectores de padrão a enxergam: só as colunas necessárias. */
export interface ChargeRow {
  readonly id: string;
  readonly accountId: string;
  readonly source: string;
  readonly status: string;
  readonly date: string;
  readonly description: string;
  readonly descriptionNormalized: string;
  readonly amountCents: number;
  readonly installmentTotal: number | null;
  readonly pluggyCategory: string | null;
  /** `kind` da categoria da transação (`transfer` fica fora de todos os padrões). */
  readonly categoryKind: string | null;
}

/** Abaixo disso vira ruído (taxas, tarifas, café): R$ 5,00. */
export const MIN_PATTERN_CHARGE_CENTS = 500;

const MAX_MESSAGE_DESCRIPTION_LENGTH = 60;
const OPEN_FINANCE_SOURCE = 'open_finance';
const POSTED_STATUS = 'posted';
const TRANSFER_CATEGORY_KIND = 'transfer';
// Pix e TED para pessoas chegam do Pluggy como "Transfer - PIX" etc.: não são cobrança.
const PLUGGY_TRANSFER_PREFIX = 'Transfer';
const SINGLE_INSTALLMENT = 1;

/** Saída postada do Open Finance que pode ser cobrança: sem parcela, transferência ou valor pequeno. */
export function isPatternCharge(row: ChargeRow): boolean {
  if (row.source !== OPEN_FINANCE_SOURCE || row.status !== POSTED_STATUS) return false;
  if (row.amountCents > -MIN_PATTERN_CHARGE_CENTS) return false;
  if (row.installmentTotal !== null && row.installmentTotal !== SINGLE_INSTALLMENT) return false;
  if (row.categoryKind === TRANSFER_CATEGORY_KIND) return false;
  return !row.pluggyCategory?.startsWith(PLUGGY_TRANSFER_PREFIX);
}

/** A descrição que entra na mensagem do alerta: limitada a 60 caracteres, nunca com valores. */
export function messageDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= MAX_MESSAGE_DESCRIPTION_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_MESSAGE_DESCRIPTION_LENGTH - 1)}…`;
}

/** Agrupa as linhas pela chave, com cada grupo ordenado por data e depois por id (ordem estável). */
export function groupByKey(
  rows: readonly ChargeRow[],
  keyOf: (row: ChargeRow) => string,
): ChargeRow[][] {
  const groups = new Map<string, ChargeRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()].map((group) =>
    group.sort(
      (left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
    ),
  );
}
