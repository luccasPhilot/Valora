import type { ChargeRow } from '../../../../src/modules/alerts/detectors/charge-row.js';

let nextRowNumber = 1;

/** Uma saída postada do Open Finance de R$ 89,90, que passa por todos os filtros; cada teste muda só o que importa. */
export function chargeRow(overrides: Partial<ChargeRow> = {}): ChargeRow {
  const rowNumber = nextRowNumber++;
  return {
    id: `00000000-0000-4000-8000-${String(rowNumber).padStart(12, '0')}`,
    accountId: 'account-a',
    source: 'open_finance',
    status: 'posted',
    date: '2026-11-10',
    description: 'Loja Exemplo',
    descriptionNormalized: 'LOJA EXEMPLO',
    amountCents: -8990,
    installmentTotal: null,
    pluggyCategory: 'Shopping',
    categoryKind: 'expense',
    ...overrides,
  };
}
