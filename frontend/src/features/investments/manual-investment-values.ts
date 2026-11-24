import type {
  ManualInvestmentChanges,
  ManualInvestmentInput,
  ManualInvestmentType,
} from '@/lib/api/investments';
import { formatDate } from '@/lib/format';
import { editAmountField } from '@/lib/hidden-amount';
import { digitsToCents } from '@/lib/money-digits';

import { investmentTypeInfo } from './investment-labels';

/** Passados tantos dias sem atualizar, a posição manual é chamada de "Desatualizada". */
export const STALE_AFTER_DAYS = 30;
export const MAX_TEXT_LENGTH = 60;

const MILLISECONDS_PER_DAY = 86_400_000;
const DEFAULT_TYPE: ManualInvestmentType = 'FIXED_INCOME';
const TYPE_ORDER: readonly ManualInvestmentType[] = [
  'FIXED_INCOME',
  'MUTUAL_FUND',
  'EQUITY',
  'ETF',
  'CRYPTO',
  'OTHER',
];

export const MANUAL_TYPE_OPTIONS = TYPE_ORDER.map((type) => ({
  value: type,
  label: investmentTypeInfo(type).label,
}));

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate}T00:00:00Z`);
  const to = Date.parse(`${toIsoDate}T00:00:00Z`);
  return Math.floor((to - from) / MILLISECONDS_PER_DAY);
}

export interface ManualUpdateInfo {
  /** "Atualizado em 10/11/2026". */
  readonly text: string;
  readonly isStale: boolean;
}

/** Quando o valor foi informado pela última vez e se já passou do prazo. Sem data, só avisa. */
export function describeManualUpdate(
  balanceUpdatedOn: string | null,
  today: string,
): ManualUpdateInfo {
  if (balanceUpdatedOn === null) return { text: 'Sem data de atualização', isStale: true };
  return {
    text: `Atualizado em ${formatDate(balanceUpdatedOn)}`,
    isStale: daysBetween(balanceUpdatedOn, today) > STALE_AFTER_DAYS,
  };
}

export interface ManualInvestmentFormValues {
  readonly name: string;
  readonly institutionName: string;
  readonly type: ManualInvestmentType;
  /** Só os dígitos do campo de valor ("250000" é R$ 2.500,00); vazio é "sem valor". */
  readonly digits: string;
}

export const EMPTY_FORM_VALUES: ManualInvestmentFormValues = {
  name: '',
  institutionName: '',
  type: DEFAULT_TYPE,
  digits: '',
};

export type ManualInvestmentField = 'name' | 'institutionName' | 'balance';
export type ManualInvestmentErrors = Partial<Record<ManualInvestmentField, string>>;

function isManualType(type: string): type is ManualInvestmentType {
  return TYPE_ORDER.some((manualType) => manualType === type);
}

interface StoredManualInvestment {
  readonly name: string;
  readonly institutionName: string;
  readonly type: string;
  readonly balanceCents: number;
}

/** O que o formulário mostra ao editar; com valores ocultos o campo de valor começa vazio. */
export function formValuesOf(
  investment: StoredManualInvestment,
  areValuesHidden: boolean,
): ManualInvestmentFormValues {
  return {
    name: investment.name,
    institutionName: investment.institutionName,
    type: isManualType(investment.type) ? investment.type : DEFAULT_TYPE,
    digits: editAmountField({ cents: investment.balanceCents, areValuesHidden }).initialDigits,
  };
}

export function validateEdit(values: ManualInvestmentFormValues): ManualInvestmentErrors {
  const errors: ManualInvestmentErrors = {};
  if (values.name.trim() === '') errors.name = 'Informe o nome do investimento';
  if (values.institutionName.trim() === '') errors.institutionName = 'Informe a instituição';
  return errors;
}

export function validateCreate(values: ManualInvestmentFormValues): ManualInvestmentErrors {
  const errors = validateEdit(values);
  if (digitsToCents(values.digits) <= 0) errors.balance = 'Informe um valor maior que zero';
  return errors;
}

export function toCreateInput(values: ManualInvestmentFormValues): ManualInvestmentInput {
  return {
    name: values.name.trim(),
    institutionName: values.institutionName.trim(),
    type: values.type,
    balanceCents: digitsToCents(values.digits),
  };
}

/**
 * Só o que mudou. O valor só vai quando o campo foi preenchido: vazio quer dizer "manter", que é
 * o caso de valores ocultos. Assim renomear nunca mexe na data da última atualização.
 */
export function toEditChanges(
  values: ManualInvestmentFormValues,
  initial: ManualInvestmentFormValues,
): ManualInvestmentChanges {
  const name = values.name.trim();
  const institutionName = values.institutionName.trim();
  const hasNewValue = values.digits !== '' && values.digits !== initial.digits;
  return {
    ...(name !== initial.name ? { name } : {}),
    ...(institutionName !== initial.institutionName ? { institutionName } : {}),
    ...(values.type !== initial.type ? { type: values.type } : {}),
    ...(hasNewValue ? { balanceCents: digitsToCents(values.digits) } : {}),
  };
}
