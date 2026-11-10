import type { InvestmentGroup, InvestmentItem } from '@/lib/api/investments';

const PALETTE_SIZE = 8;
// As variáveis cruas (`--chart-N`) sempre existem; as `--color-chart-N` do Tailwind só são emitidas quando alguma classe as usa.
const OTHER_COLOR = 'var(--chart-other)';

/**
 * Cor do tipo na composição desta tela: os slots da paleta de gráficos, em ordem e sem pular.
 * Do nono tipo em diante vale o cinza de "Outros". É uma escolha só da tela Investimentos (os tipos
 * são poucos e fixos); não é um padrão para as outras telas. A cor só marca: o nome do tipo sempre aparece em texto.
 */
export function seriesColor(index: number): string {
  return index < PALETTE_SIZE ? `var(--chart-${String(index + 1)})` : OTHER_COLOR;
}

export interface RankedPosition extends InvestmentItem {
  readonly type: string;
}

/** As maiores posições de todos os tipos, da maior para a menor (só escolha e ordem; nada é recalculado). */
export function topPositions(groups: readonly InvestmentGroup[], count: number): RankedPosition[] {
  return groups
    .flatMap((group) => group.items.map((item) => ({ ...item, type: group.type })))
    .sort((first, second) => second.balanceCents - first.balanceCents)
    .slice(0, count);
}

/** Tipos com saldo positivo, os únicos que ocupam uma fatia da barra de composição. */
export function groupsWithShare(groups: readonly InvestmentGroup[]): InvestmentGroup[] {
  return groups.filter(({ totalCents }) => totalCents > 0);
}

/** A cor de cada tipo com fatia, na ordem da lista (maior primeiro); quem não tem fatia fica em cinza. */
export function colorsByType(groups: readonly InvestmentGroup[]): Map<string, string> {
  return new Map(groupsWithShare(groups).map(({ type }, index) => [type, seriesColor(index)]));
}

export function colorOfType(colors: ReadonlyMap<string, string>, type: string): string {
  return colors.get(type) ?? OTHER_COLOR;
}
