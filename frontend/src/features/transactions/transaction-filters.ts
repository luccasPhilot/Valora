import type { Category } from '@/lib/api/categories';
import {
  type AccountOption,
  TRANSACTION_TYPES,
  type TransactionQuery,
  type TransactionSource,
  type TransactionType,
} from '@/lib/api/transactions';
import { firstDayOfMonth, lastDayOfMonth } from '@/lib/dates';
import { formatDate } from '@/lib/format';

export type PeriodPreset = 'this-month' | 'last-month' | 'last-3-months' | 'this-year' | 'custom';

export const DEFAULT_PERIOD: PeriodPreset = 'this-month';

export const PERIOD_PRESETS: readonly PeriodPreset[] = [
  'this-month',
  'last-month',
  'last-3-months',
  'this-year',
  'custom',
];

export const PERIOD_LABELS: Readonly<Record<PeriodPreset, string>> = {
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  'last-3-months': 'Últimos 3 meses',
  'this-year': 'Este ano',
  custom: 'Personalizado',
};

export const TYPE_LABELS: Readonly<Record<TransactionType, string>> = {
  income: 'Receitas',
  expense: 'Despesas',
  transfer: 'Transferências',
};

export const TRANSACTION_SOURCES: readonly TransactionSource[] = ['open_finance', 'manual'];

export const SOURCE_LABELS: Readonly<Record<TransactionSource, string>> = {
  open_finance: 'Open Finance',
  manual: 'Lançamento manual',
};

const POSSIBLE_DUPLICATES_LABEL = 'Possíveis duplicatas';
const POSSIBLE_DUPLICATES_PARAM_VALUE = '1';

export interface TransactionFilters {
  readonly period: PeriodPreset;
  /** Só valem com o período `custom`. */
  readonly from: string | null;
  readonly to: string | null;
  readonly categoryId: string | null;
  readonly type: TransactionType | null;
  readonly accountId: string | null;
  readonly source: TransactionSource | null;
  /** Só as transações do banco com possível duplicata esperando conferência. */
  readonly possibleDuplicate: boolean;
  readonly search: string;
}

export const NO_FILTERS: TransactionFilters = {
  period: DEFAULT_PERIOD,
  from: null,
  to: null,
  categoryId: null,
  type: null,
  accountId: null,
  source: null,
  possibleDuplicate: false,
  search: '',
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readPeriod(value: string | null): PeriodPreset {
  return PERIOD_PRESETS.find((preset) => preset === value) ?? DEFAULT_PERIOD;
}

function readType(value: string | null): TransactionType | null {
  return TRANSACTION_TYPES.find((type) => type === value) ?? null;
}

function readSource(value: string | null): TransactionSource | null {
  return TRANSACTION_SOURCES.find((source) => source === value) ?? null;
}

function readDate(value: string | null): string | null {
  return value !== null && ISO_DATE_PATTERN.test(value) ? value : null;
}

/** Os filtros vivem na URL: voltar, recarregar e compartilhar o link mantêm o que foi escolhido. */
export function parseFilters(params: URLSearchParams): TransactionFilters {
  return {
    period: readPeriod(params.get('period')),
    from: readDate(params.get('from')),
    to: readDate(params.get('to')),
    categoryId: params.get('category'),
    type: readType(params.get('type')),
    accountId: params.get('account'),
    source: readSource(params.get('source')),
    possibleDuplicate: params.get('duplicates') === POSSIBLE_DUPLICATES_PARAM_VALUE,
    search: params.get('search') ?? '',
  };
}

/** Só grava o que difere do padrão, para a URL sem filtros ficar limpa. */
export function serializeFilters(filters: TransactionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.period !== DEFAULT_PERIOD) params.set('period', filters.period);
  if (filters.period === 'custom' && filters.from) params.set('from', filters.from);
  if (filters.period === 'custom' && filters.to) params.set('to', filters.to);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.type) params.set('type', filters.type);
  if (filters.accountId) params.set('account', filters.accountId);
  if (filters.source) params.set('source', filters.source);
  if (filters.possibleDuplicate) params.set('duplicates', POSSIBLE_DUPLICATES_PARAM_VALUE);
  if (filters.search) params.set('search', filters.search);
  return params;
}

interface DateRange {
  readonly from: string | undefined;
  readonly to: string | undefined;
}

/**
 * "Últimos 3 meses" são o mês atual e os dois anteriores, inteiros. No período personalizado, uma
 * ponta em branco fica aberta; sem nenhuma das duas, vale o mês atual.
 */
export function resolvePeriod(filters: TransactionFilters, today: string): DateRange {
  switch (filters.period) {
    case 'this-month':
      return { from: firstDayOfMonth(today), to: lastDayOfMonth(today) };
    case 'last-month':
      return { from: firstDayOfMonth(today, -1), to: lastDayOfMonth(today, -1) };
    case 'last-3-months':
      return { from: firstDayOfMonth(today, -2), to: lastDayOfMonth(today) };
    case 'this-year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case 'custom':
      if (!filters.from && !filters.to) return resolvePeriod(NO_FILTERS, today);
      return { from: filters.from ?? undefined, to: filters.to ?? undefined };
  }
}

export function toTransactionQuery(filters: TransactionFilters, today: string): TransactionQuery {
  const { from, to } = resolvePeriod(filters, today);
  return {
    from,
    to,
    categoryId: filters.categoryId ?? undefined,
    type: filters.type ?? undefined,
    accountId: filters.accountId ?? undefined,
    source: filters.source ?? undefined,
    possibleDuplicate: filters.possibleDuplicate || undefined,
    search: filters.search || undefined,
  };
}

export function hasFiltersBesidesPeriod(filters: TransactionFilters): boolean {
  return Boolean(
    filters.categoryId ||
    filters.type ||
    filters.accountId ||
    filters.source ||
    filters.possibleDuplicate ||
    filters.search.trim() !== '',
  );
}

export interface FilterChip {
  readonly key: string;
  readonly label: string;
  readonly filtersWithoutIt: TransactionFilters;
}

export function accountOptionLabel(account: AccountOption): string {
  return account.institutionName ? `${account.institutionName} · ${account.name}` : account.name;
}

interface ChipLookups {
  readonly categories: readonly Category[];
  readonly accounts: readonly AccountOption[];
}

function customPeriodLabel(filters: TransactionFilters): string {
  if (filters.from && filters.to) {
    return `${formatDate(filters.from)} a ${formatDate(filters.to)}`;
  }
  if (filters.from) return `A partir de ${formatDate(filters.from)}`;
  if (filters.to) return `Até ${formatDate(filters.to)}`;
  return PERIOD_LABELS.custom;
}

/** Cada filtro ativo vira um chip; o período padrão (este mês) não precisa de chip. */
export function describeActiveFilters(
  filters: TransactionFilters,
  lookups: ChipLookups,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.period !== DEFAULT_PERIOD) {
    const label =
      filters.period === 'custom' ? customPeriodLabel(filters) : PERIOD_LABELS[filters.period];
    chips.push({
      key: 'period',
      label,
      filtersWithoutIt: { ...filters, period: DEFAULT_PERIOD, from: null, to: null },
    });
  }
  if (filters.categoryId) {
    const category = lookups.categories.find((candidate) => candidate.id === filters.categoryId);
    chips.push({
      key: 'category',
      label: category?.name ?? 'Categoria',
      filtersWithoutIt: { ...filters, categoryId: null },
    });
  }
  if (filters.type) {
    chips.push({
      key: 'type',
      label: TYPE_LABELS[filters.type],
      filtersWithoutIt: { ...filters, type: null },
    });
  }
  if (filters.accountId) {
    const account = lookups.accounts.find((candidate) => candidate.id === filters.accountId);
    chips.push({
      key: 'account',
      label: account ? accountOptionLabel(account) : 'Conta',
      filtersWithoutIt: { ...filters, accountId: null },
    });
  }
  if (filters.source) {
    chips.push({
      key: 'source',
      label: SOURCE_LABELS[filters.source],
      filtersWithoutIt: { ...filters, source: null },
    });
  }
  if (filters.possibleDuplicate) {
    chips.push({
      key: 'duplicates',
      label: POSSIBLE_DUPLICATES_LABEL,
      filtersWithoutIt: { ...filters, possibleDuplicate: false },
    });
  }
  if (filters.search.trim() !== '') {
    chips.push({
      key: 'search',
      label: `“${filters.search.trim()}”`,
      filtersWithoutIt: { ...filters, search: '' },
    });
  }
  return chips;
}
