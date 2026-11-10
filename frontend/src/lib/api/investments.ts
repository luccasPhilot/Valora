import { z } from 'zod';

import { apiGet } from '../api-client';

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

export type InvestmentItem = z.infer<typeof investmentItemSchema>;
export type InvestmentGroup = z.infer<typeof investmentGroupSchema>;
export type Investments = z.infer<typeof investmentsSchema>;

// Sem paginação: são poucas dezenas de posições no máximo.
export function getInvestments(): Promise<Investments> {
  return apiGet('/investments', investmentsSchema);
}
