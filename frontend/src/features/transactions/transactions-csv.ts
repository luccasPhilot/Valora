import type { Transaction, TransactionQuery, TransactionType } from '@/lib/api/transactions';
import { formatDate, formatSpreadsheetAmount } from '@/lib/format';

import { UNCATEGORIZED_LABEL } from './transaction-filters';

// Feito para o Excel em pt-BR: o BOM faz ele ler UTF-8 (acentos), e o separador da lista é `;`.
const BYTE_ORDER_MARK = '﻿';
const SEPARATOR = ';';
const LINE_END = '\r\n';
const QUOTE = '"';
const ESCAPED_QUOTE = '""';
// Texto que começa com estes caracteres vira fórmula no Excel; o apóstrofo o mantém como texto.
const FORMULA_START = /^[=+\-@\t\r]/;
const FORMULA_GUARD = "'";

const HEADER = [
  'Data',
  'Descrição',
  'Categoria',
  'Tipo',
  'Conta',
  'Valor',
  'Situação',
  'Origem',
  'Parcela',
];

const TYPE_LABELS: Readonly<Record<TransactionType, string>> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
};

const STATUS_LABELS: Readonly<Record<Transaction['status'], string>> = {
  pending: 'Pendente',
  posted: 'Confirmada',
};

const SOURCE_LABELS: Readonly<Record<Transaction['source'], string>> = {
  open_finance: 'Banco',
  manual: 'Manual',
};

/**
 * A mesma regra da API (`transaction-type-filter.ts` do backend): a categoria de transferência
 * decide a transferência; numa categoria de despesa é sempre despesa (o estorno reduz a despesa);
 * fora delas, a entrada é receita e a saída é despesa.
 */
function transactionType({ amountCents, category }: Transaction): TransactionType {
  if (category?.kind === 'transfer') return 'transfer';
  if (category?.kind === 'expense') return 'expense';
  return amountCents > 0 ? 'income' : 'expense';
}

// "3 de 10", não "3/10": o Excel transformaria "3/10" na data 3 de outubro.
function installmentLabel({ installmentNumber, installmentTotal }: Transaction): string {
  if (installmentNumber === null || installmentTotal === null) return '';
  return `${installmentNumber} de ${installmentTotal}`;
}

function quoteText(text: string): string {
  const guarded = FORMULA_START.test(text) ? `${FORMULA_GUARD}${text}` : text;
  return `${QUOTE}${guarded.replaceAll(QUOTE, ESCAPED_QUOTE)}${QUOTE}`;
}

// Data e valor sem aspas, para o Excel reconhecer como data e número.
function toCsvLine(transaction: Transaction): string {
  return [
    formatDate(transaction.date),
    quoteText(transaction.description),
    quoteText(transaction.category?.name ?? UNCATEGORIZED_LABEL),
    quoteText(TYPE_LABELS[transactionType(transaction)]),
    quoteText(transaction.account.name),
    formatSpreadsheetAmount(transaction.amountCents),
    quoteText(STATUS_LABELS[transaction.status]),
    quoteText(SOURCE_LABELS[transaction.source]),
    quoteText(installmentLabel(transaction)),
  ].join(SEPARATOR);
}

/** O CSV das transações, pronto para baixar: UTF-8 com BOM, `;`, `\r\n` e valores com vírgula. */
export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const lines = [HEADER.join(SEPARATOR), ...transactions.map(toCsvLine)];
  return `${BYTE_ORDER_MARK}${lines.map((line) => `${line}${LINE_END}`).join('')}`;
}

/** `valora-transacoes-2026-11-01-a-2026-11-30.csv`; uma ponta aberta vira "inicio" ou "hoje". */
export function transactionsCsvFileName({
  from,
  to,
}: Pick<TransactionQuery, 'from' | 'to'>): string {
  return `valora-transacoes-${from ?? 'inicio'}-a-${to ?? 'hoje'}.csv`;
}
