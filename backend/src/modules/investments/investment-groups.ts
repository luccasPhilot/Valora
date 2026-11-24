import { z } from 'zod';

import { percentWithOneDecimal } from '../../shared/percent.js';

export const investmentSourceSchema = z.enum(['open_finance', 'manual']);
export type InvestmentSource = z.infer<typeof investmentSourceSchema>;

export interface InvestmentPosition {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly subtype: string | null;
  readonly balanceCents: number;
  readonly institutionName: string;
  readonly source: InvestmentSource;
  /** Dia do último valor informado; só em posição manual. */
  readonly balanceUpdatedOn: string | null;
}

export interface InvestmentItem extends InvestmentPosition {
  /** Fatia do total, com uma casa decimal. */
  readonly percent: number;
}

export interface InvestmentGroup {
  readonly type: string;
  readonly totalCents: number;
  readonly percent: number;
  readonly items: InvestmentItem[];
}

export interface InvestmentOverview {
  readonly totals: {
    readonly totalCents: number;
    readonly positionsCount: number;
    /** Posições com saldo zero (resgatadas): não entram na lista. */
    readonly closedCount: number;
  };
  readonly groups: InvestmentGroup[];
}

function sumBalances(positions: readonly InvestmentPosition[]): number {
  return positions.reduce((sum, { balanceCents }) => sum + balanceCents, 0);
}

function compareItems(first: InvestmentPosition, second: InvestmentPosition): number {
  return (
    second.balanceCents - first.balanceCents ||
    first.name.localeCompare(second.name, 'pt-BR') ||
    first.id.localeCompare(second.id)
  );
}

function groupByType(positions: readonly InvestmentPosition[]): Map<string, InvestmentPosition[]> {
  const grouped = new Map<string, InvestmentPosition[]>();
  for (const position of positions) {
    grouped.set(position.type, [...(grouped.get(position.type) ?? []), position]);
  }
  return grouped;
}

/** Agrupa as posições por tipo, com totais e percentuais. Posições zeradas só entram na contagem. */
export function groupInvestments(positions: readonly InvestmentPosition[]): InvestmentOverview {
  const openPositions = positions.filter(({ balanceCents }) => balanceCents !== 0);
  const totalCents = sumBalances(openPositions);
  const groups = [...groupByType(openPositions)].map(([type, members]) => ({
    type,
    totalCents: sumBalances(members),
    percent: percentWithOneDecimal(sumBalances(members), totalCents),
    items: [...members].sort(compareItems).map((member) => ({
      ...member,
      percent: percentWithOneDecimal(member.balanceCents, totalCents),
    })),
  }));
  groups.sort(
    (first, second) =>
      second.totalCents - first.totalCents || first.type.localeCompare(second.type),
  );
  return {
    totals: {
      totalCents,
      positionsCount: openPositions.length,
      closedCount: positions.length - openPositions.length,
    },
    groups,
  };
}
