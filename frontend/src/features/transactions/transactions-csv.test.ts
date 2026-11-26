import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/api/transactions';

import { transactionsCsvFileName, transactionsToCsv } from './transactions-csv';

const BYTE_ORDER_MARK = '﻿';
const HEADER = 'Data;Descrição;Categoria;Tipo;Conta;Valor;Situação;Origem;Parcela';

const GROCERIES = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mercado',
  icon: 'shopping-cart',
  kind: 'expense',
} as const;
const SALARY = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Salário',
  icon: 'wallet',
  kind: 'income',
} as const;
const CARD_PAYMENT = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Pagamento de fatura',
  icon: 'credit-card',
  kind: 'transfer',
} as const;

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    date: '2026-11-04',
    description: 'FARMÁCIA SÃO JOÃO',
    amountCents: -8990,
    status: 'posted',
    source: 'open_finance',
    category: GROCERIES,
    categorySource: 'rule',
    account: { id: '55555555-5555-4555-8555-555555555555', name: 'Nubank', type: 'checking' },
    installmentNumber: null,
    installmentTotal: null,
    possibleDuplicateOfId: null,
    note: null,
    tags: [],
    ...overrides,
  };
}

/** A linha de dados `index` (0 é a primeira depois do cabeçalho). */
function dataLine(csv: string, index = 0): string {
  return csv.split('\r\n')[index + 1] ?? '';
}

describe('transactionsToCsv', () => {
  it('should_start_with_the_byte_order_mark_when_building_the_file', () => {
    // Arrange
    const rows = [transaction({})];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(csv.startsWith(`${BYTE_ORDER_MARK}${HEADER}\r\n`)).toBe(true);
  });

  it('should_end_every_line_with_crlf_when_there_are_rows', () => {
    // Arrange
    const rows = [transaction({}), transaction({ description: 'OUTRA' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(csv.split('\r\n')).toHaveLength(4);
  });

  it('should_write_only_the_header_when_there_are_no_rows', () => {
    // Arrange
    const rows: Transaction[] = [];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(csv).toBe(`${BYTE_ORDER_MARK}${HEADER}\r\n`);
  });

  it('should_write_a_purchase_with_semicolons_quotes_and_accents_when_it_is_an_expense', () => {
    // Arrange
    const rows = [transaction({})];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toBe(
      '04/11/2026;"FARMÁCIA SÃO JOÃO";"Mercado";"Despesa";"Nubank";-89,90;"Confirmada";"Banco";""',
    );
  });

  it('should_double_inner_quotes_and_keep_the_semicolon_inside_the_field_when_the_description_has_them', () => {
    // Arrange
    const rows = [transaction({ description: 'LOJA "A; B"' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"LOJA ""A; B""";');
  });

  it('should_write_the_amount_without_sign_when_it_is_an_income', () => {
    // Arrange
    const rows = [transaction({ amountCents: 500000, category: SALARY })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Receita";"Nubank";5000,00;');
  });

  it('should_mark_the_type_as_transfer_when_the_category_is_a_transfer', () => {
    // Arrange
    const rows = [transaction({ amountCents: -150000, category: CARD_PAYMENT })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Pagamento de fatura";"Transferência";');
  });

  it('should_keep_a_refund_as_expense_when_an_entry_is_in_an_expense_category', () => {
    // Arrange
    const rows = [transaction({ amountCents: 2000, category: GROCERIES })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Despesa";"Nubank";20,00;');
  });

  it('should_write_uncategorized_and_income_when_an_entry_has_no_category', () => {
    // Arrange
    const rows = [transaction({ amountCents: 1500, category: null, categorySource: 'none' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Sem categoria";"Receita";');
  });

  it('should_write_uncategorized_and_expense_when_an_outflow_has_no_category', () => {
    // Arrange
    const rows = [transaction({ category: null, categorySource: 'none' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Sem categoria";"Despesa";');
  });

  it('should_write_the_installment_as_text_when_the_purchase_is_in_installments', () => {
    // Arrange
    const rows = [transaction({ installmentNumber: 3, installmentTotal: 10 })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv).endsWith(';"3 de 10"')).toBe(true);
  });

  it('should_write_pending_and_manual_when_the_transaction_is_pending_and_manual', () => {
    // Arrange
    const rows = [transaction({ status: 'pending', source: 'manual' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"Pendente";"Manual";');
  });

  it('should_neutralize_a_formula_when_the_description_starts_with_an_equals_sign', () => {
    // Arrange
    const rows = [transaction({ description: '=HYPERLINK("x")' })];
    // Act
    const csv = transactionsToCsv(rows);
    // Assert
    expect(dataLine(csv)).toContain(';"\'=HYPERLINK(""x"")";');
  });
});

describe('transactionsCsvFileName', () => {
  it('should_name_the_file_with_both_dates_when_the_period_is_closed', () => {
    // Arrange
    const query = { from: '2026-11-01', to: '2026-11-30' };
    // Act
    const fileName = transactionsCsvFileName(query);
    // Assert
    expect(fileName).toBe('valora-transacoes-2026-11-01-a-2026-11-30.csv');
  });

  it('should_name_the_open_end_when_the_period_has_only_an_end_date', () => {
    // Arrange
    const query = { to: '2026-11-30' };
    // Act
    const fileName = transactionsCsvFileName(query);
    // Assert
    expect(fileName).toBe('valora-transacoes-inicio-a-2026-11-30.csv');
  });

  it('should_name_the_open_end_when_the_period_has_only_a_start_date', () => {
    // Arrange
    const query = { from: '2026-11-01' };
    // Act
    const fileName = transactionsCsvFileName(query);
    // Assert
    expect(fileName).toBe('valora-transacoes-2026-11-01-a-hoje.csv');
  });
});
