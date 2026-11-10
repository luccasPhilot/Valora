const PERCENT_SCALE = 1000;
const PERCENT_DECIMALS_DIVISOR = 10;

export interface InvestmentPosition {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly subtype: string | null;
  readonly balanceCents: number;
  readonly institutionName: string;
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

// Uma casa decimal, em inteiros; total zero não divide.
function percentOf(cents: number, totalCents: number): number {
  if (totalCents === 0) return 0;
  return Math.round((cents * PERCENT_SCALE) / totalCents) / PERCENT_DECIMALS_DIVISOR;
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
    percent: percentOf(sumBalances(members), totalCents),
    items: [...members]
      .sort(compareItems)
      .map((member) => ({ ...member, percent: percentOf(member.balanceCents, totalCents) })),
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
