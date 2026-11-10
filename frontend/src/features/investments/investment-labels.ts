import {
  ChartPie,
  Ellipsis,
  FileText,
  Layers,
  type LucideIcon,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const OTHER_TYPE_LABEL = 'Outros';

interface TypeInfo {
  readonly label: string;
  readonly icon: LucideIcon;
}

const TYPES: Readonly<Record<string, TypeInfo>> = {
  FIXED_INCOME: { label: 'Renda fixa', icon: PiggyBank },
  MUTUAL_FUND: { label: 'Fundos', icon: ChartPie },
  EQUITY: { label: 'Ações', icon: TrendingUp },
  ETF: { label: 'ETFs', icon: Layers },
  SECURITY: { label: 'Títulos e previdência', icon: ShieldCheck },
  COE: { label: 'COE', icon: FileText },
};

const OTHER_TYPE: TypeInfo = { label: OTHER_TYPE_LABEL, icon: Ellipsis };

const SUBTYPE_LABELS: Readonly<Record<string, string>> = {
  CDB: 'CDB',
  LCI: 'LCI',
  LCA: 'LCA',
  LC: 'LC',
  LIG: 'LIG',
  CRI: 'CRI',
  CRA: 'CRA',
  TREASURY: 'Tesouro Direto',
  DEBENTURE: 'Debênture',
  MULTIMARKET_FUND: 'Fundo multimercado',
  STOCK_FUND: 'Fundo de ações',
  FIXED_INCOME_FUND: 'Fundo de renda fixa',
  ETF_FUND: 'Fundo de ETFs',
  RETIREMENT: 'Previdência',
  PGBL: 'PGBL',
  VGBL: 'VGBL',
};

export function investmentTypeInfo(type: string): TypeInfo {
  return TYPES[type] ?? OTHER_TYPE;
}

/** "Tesouro Direto", "CDB"... Um código que o app não conhece vira texto legível ("Novo tipo"). */
export function investmentSubtypeLabel(subtype: string): string {
  const known = SUBTYPE_LABELS[subtype];
  if (known) return known;
  const readable = subtype.replaceAll('_', ' ').toLowerCase();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${String(count)} ${count === 1 ? singular : pluralForm}`;
}

/** "3 posições em 2 instituições". */
export function describePositions(positionsCount: number, institutionsCount: number): string {
  return `${plural(positionsCount, 'posição', 'posições')} em ${plural(institutionsCount, 'instituição', 'instituições')}`;
}

/** Rodapé das posições resgatadas: "1 posição zerada não aparece". */
export function describeClosedPositions(closedCount: number): string {
  return closedCount === 1
    ? '1 posição zerada não aparece na lista'
    : `${String(closedCount)} posições zeradas não aparecem na lista`;
}
