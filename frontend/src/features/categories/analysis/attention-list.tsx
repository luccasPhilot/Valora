import { ChevronRight, CircleAlert, type LucideIcon, Tag, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import type { AttentionPoint } from '@/lib/api/category-insights';
import { formatPercent } from '@/lib/format';

const FULL_PERCENT = 100;
const ROW_CLASSES =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring';

interface PointDisplay {
  readonly icon: LucideIcon;
  /** Só o orçamento estourado usa a cor de status crítico; as outras ficam na cor normal. */
  readonly iconClass: string;
  readonly text: ReactNode;
}

function describePoint(point: AttentionPoint): PointDisplay {
  switch (point.type) {
    case 'budget_exceeded':
      return {
        icon: CircleAlert,
        iconClass: 'text-status-critical',
        text: (
          <>
            {point.name} passou do orçamento: <Money cents={point.spentCents} isTrimmed /> de{' '}
            <Money cents={point.limitCents} isTrimmed />
          </>
        ),
      };
    case 'category_surge':
      return {
        icon: TrendingUp,
        iconClass: 'text-muted-foreground',
        text: (
          <>
            {point.name} subiu {formatPercent(point.variationPercent / FULL_PERCENT)} (
            <Money cents={point.differenceCents} isSigned />)
          </>
        ),
      };
    case 'uncategorized_high':
      return {
        icon: Tag,
        iconClass: 'text-muted-foreground',
        text: (
          <>
            <Money cents={point.spentCents} /> ({formatPercent(point.percent / FULL_PERCENT)}) do
            gasto está sem categoria
          </>
        ),
      };
  }
}

interface AttentionListProps {
  attention: readonly AttentionPoint[];
  /** Abre o detalhe da categoria do ponto (orçamento estourado e alta forte). */
  onSelectCategory: (categoryId: string) => void;
  /** Transações sem categoria do mês, para o ponto "sem categoria". */
  uncategorizedPath: string | null;
}

function PointRow({
  point,
  onSelectCategory,
  uncategorizedPath,
}: { point: AttentionPoint } & Omit<AttentionListProps, 'attention'>) {
  const { icon: Icon, iconClass, text } = describePoint(point);
  const content = (
    <>
      <Icon className={`size-5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words">{text}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );
  if (point.type === 'uncategorized_high') {
    if (uncategorizedPath === null) return <div className={ROW_CLASSES}>{content}</div>;
    return (
      <Link to={uncategorizedPath} className={ROW_CLASSES}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onSelectCategory(point.categoryId)}
      className={ROW_CLASSES}
    >
      {content}
    </button>
  );
}

function pointKey(point: AttentionPoint): string {
  return point.type === 'uncategorized_high' ? point.type : `${point.type}:${point.categoryId}`;
}

/** O que pede uma decisão agora, em regras fixas. Sem pontos, a seção não aparece. */
export function AttentionList({
  attention,
  onSelectCategory,
  uncategorizedPath,
}: AttentionListProps) {
  if (attention.length === 0) return null;
  return (
    <DataCard title="Pede atenção" icon={CircleAlert}>
      <ul className="-mx-2 space-y-1">
        {attention.map((point) => (
          <li key={pointKey(point)}>
            <PointRow
              point={point}
              onSelectCategory={onSelectCategory}
              uncategorizedPath={uncategorizedPath}
            />
          </li>
        ))}
      </ul>
    </DataCard>
  );
}
