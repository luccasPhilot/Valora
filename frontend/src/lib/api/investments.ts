import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '../api-client';

// Contrato de /investments. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/investments/investments.routes.ts). Os tipos chegam como códigos do Pluggy.

const investmentItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  subtype: z.string().nullable(),
  balanceCents: z.int(),
  /** Fatia do total, de 0 a 100, com uma casa decimal. */
  percent: z.number(),
  institutionName: z.string(),
  /** `manual`: cadastrada à mão; só ela pode ser editada e excluída. */
  source: z.enum(['open_finance', 'manual']),
  /** AAAA-MM-DD do último valor informado; só em posição manual. */
  balanceUpdatedOn: z.string().nullable(),
});

const manualInvestmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string(),
  type: z.string(),
  balanceCents: z.int(),
  source: z.literal('manual'),
  balanceUpdatedOn: z.string().nullable(),
});

const investmentGroupSchema = z.object({
  /** Código do tipo no Pluggy (`FIXED_INCOME`, `MUTUAL_FUND`...). */
  type: z.string(),
  totalCents: z.int(),
  percent: z.number(),
  items: z.array(investmentItemSchema),
});

const investmentsSchema = z.object({
  totals: z.object({
    totalCents: z.int(),
    positionsCount: z.int(),
    /** Posições zeradas (resgatadas): não aparecem em `groups`. */
    closedCount: z.int(),
  }),
  groups: z.array(investmentGroupSchema),
});

/** Tipos que uma posição manual aceita (`CRYPTO` é do Valora; o Pluggy não tem tipo de cripto). */
export const MANUAL_INVESTMENT_TYPES = [
  'FIXED_INCOME',
  'MUTUAL_FUND',
  'EQUITY',
  'ETF',
  'CRYPTO',
  'OTHER',
] as const;

export type ManualInvestmentType = (typeof MANUAL_INVESTMENT_TYPES)[number];

export interface ManualInvestmentInput {
  readonly name: string;
  readonly institutionName: string;
  readonly type: ManualInvestmentType;
  readonly balanceCents: number;
}

export type ManualInvestmentChanges = Partial<ManualInvestmentInput>;

export type InvestmentItem = z.infer<typeof investmentItemSchema>;
export type InvestmentGroup = z.infer<typeof investmentGroupSchema>;
export type Investments = z.infer<typeof investmentsSchema>;

// Sem paginação: são poucas dezenas de posições no máximo.
export function getInvestments(): Promise<Investments> {
  return apiGet('/investments', investmentsSchema);
}

/** Cadastra uma posição manual (o valor é em centavos, maior que zero). */
export function createManualInvestment(input: ManualInvestmentInput) {
  return apiPost('/investments', input, manualInvestmentSchema);
}

/** Edição parcial; só `balanceCents` muda a data da última atualização. Zero encerra a posição. */
export function updateManualInvestment(id: string, changes: ManualInvestmentChanges) {
  return apiPatch(`/investments/${id}`, changes, manualInvestmentSchema);
}

/** Apaga a posição, as fotos dela e os vínculos de metas. */
export function deleteManualInvestment(id: string): Promise<void> {
  return apiDelete(`/investments/${id}`);
}
