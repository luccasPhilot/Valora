import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { ValueRow } from '@/components/cards/value-row';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { InvestmentGroup, InvestmentItem } from '@/lib/api/investments';
import { formatPercent } from '@/lib/format';

import { investmentSubtypeLabel, investmentTypeInfo } from './investment-labels';
import type { RankedPosition } from './investment-view';
import { describeManualUpdate } from './manual-investment-values';

const FULL_PERCENT = 100;
/** Quantas posições aparecem antes de "Mostrar mais": a lista não vira um muro de linhas. */
export const COLLAPSED_ROW_COUNT = 5;

function describeOrigin(item: InvestmentItem): string {
  if (item.subtype === null) return item.institutionName;
  return `${investmentSubtypeLabel(item.subtype)} · ${item.institutionName}`;
}

interface InvestmentRowProps {
  item: InvestmentItem;
  type: string;
  today: string;
  onSelectManual: (position: RankedPosition) => void;
}

function ManualBadge() {
  return (
    <span className="shrink-0 rounded-full border px-2 text-xs font-medium text-muted-foreground">
      Manual
    </span>
  );
}

// "Desatualizado" é texto na cor normal: vermelho é só para estouro, erro e saldo negativo.
function InvestmentRow({ item, type, today, onSelectManual }: InvestmentRowProps) {
  const common = {
    title: item.name,
    subtitle: describeOrigin(item),
    value: <Money cents={item.balanceCents} />,
    share: formatPercent(item.percent / FULL_PERCENT),
  };
  if (item.source !== 'manual') return <ValueRow {...common} />;
  const update = describeManualUpdate(item.balanceUpdatedOn, today);
  return (
    <ValueRow
      {...common}
      badge={<ManualBadge />}
      detail={update.isStale ? `${update.text} · Desatualizado` : update.text}
      selectLabel={`Editar ${item.name}`}
      onSelect={() => onSelectManual({ ...item, type })}
    />
  );
}

interface InvestmentGroupCardProps {
  group: InvestmentGroup;
  /** AAAA-MM-DD de hoje: decide quando uma posição manual está desatualizada. */
  today: string;
  /** Abre a posição manual para editar; posição do Open Finance não tem ação. */
  onSelectManual: (position: RankedPosition) => void;
  /** A mesma cor do tipo na barra de composição: liga o cartão à legenda. */
  color: string;
}

/**
 * Nível 2: um tipo. O título é pequeno (o que é), o total é o maior texto (o que importa) e as
 * posições são o nível 3: linhas sem moldura, com no máximo cinco à vista.
 */
export function InvestmentGroupCard({
  group,
  today,
  onSelectManual,
  color,
}: InvestmentGroupCardProps) {
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount = Math.max(0, group.items.length - COLLAPSED_ROW_COUNT);
  const visibleItems = isExpanded ? group.items : group.items.slice(0, COLLAPSED_ROW_COUNT);
  return (
    <DataCard
      title={investmentTypeInfo(group.type).label}
      headingLevel="h3"
      marker={
        <span
          className="size-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      }
    >
      <Metric
        value={<Money cents={group.totalCents} />}
        caption={`${formatPercent(group.percent / FULL_PERCENT)} do total`}
      />
      <ul id={listId} className="divide-y border-t">
        {visibleItems.map((item) => (
          <InvestmentRow
            key={item.id}
            item={item}
            type={group.type}
            today={today}
            onSelectManual={onSelectManual}
          />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <Button
          variant="ghost"
          className="w-full"
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Mostrar menos' : `Mostrar mais ${String(hiddenCount)}`}
          <ChevronDown
            className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      ) : null}
    </DataCard>
  );
}
