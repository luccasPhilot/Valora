import { ChevronDown, ChevronRight, CircleCheck } from 'lucide-react';
import { Fragment, type ReactNode, useId, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

/** Quantas linhas aparecem antes de "Mostrar mais": a lista não vira um muro de linhas. */
const COLLAPSED_ROW_COUNT = 5;

const ROW_CLASSES = 'flex min-h-12 items-center gap-3 py-2';
const LINK_ROW_CLASSES = `${ROW_CLASSES} w-full rounded-md text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50`;

interface HealthRowProps {
  title: string;
  /** O que a linha diz sobre o item, logo abaixo do nome. */
  description: string;
  /** Terceira linha, pequena e apagada. */
  detail?: ReactNode;
  /** O que fica à direita: um valor, um selo ou o resultado. */
  trailing?: ReactNode;
  /** Com ele, a linha inteira vira um link (alvo de 48 px). */
  to?: string;
}

function RowContent({ title, description, detail, trailing, to }: HealthRowProps) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
        {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
      </span>
      {trailing ? (
        <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {trailing}
        </span>
      ) : null}
      {to ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </>
  );
}

export function HealthRow(props: HealthRowProps) {
  if (!props.to) {
    return (
      <li className={ROW_CLASSES}>
        <RowContent {...props} />
      </li>
    );
  }
  return (
    <li>
      <Link to={props.to} className={LINK_ROW_CLASSES}>
        <RowContent {...props} />
      </Link>
    </li>
  );
}

interface CollapsibleRowsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderRow: (item: T) => ReactNode;
}

/** As 5 primeiras linhas e "Mostrar mais N" (Design System, "Hierarquia dos cartões"). */
export function CollapsibleRows<T>({ items, getKey, renderRow }: CollapsibleRowsProps<T>) {
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, COLLAPSED_ROW_COUNT);
  const hiddenCount = items.length - COLLAPSED_ROW_COUNT;
  return (
    <>
      <ul id={listId} className="divide-y border-t">
        {visibleItems.map((item) => (
          <Fragment key={getKey(item)}>{renderRow(item)}</Fragment>
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
    </>
  );
}

interface AllGoodProps {
  /** Uma linha que diz o que foi conferido. */
  description: string;
}

/** O estado de uma seção sem nada a conferir: ícone e texto, nunca só a cor. */
export function AllGood({ description }: AllGoodProps) {
  return (
    <div className="flex items-start gap-3">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Tudo certo</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
