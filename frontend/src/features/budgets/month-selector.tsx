import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatMonth } from '@/lib/format';

import { shiftMonth } from './budget-months';

interface MonthSelectorProps {
  /** `AAAA-MM`. */
  month: string;
  onChange: (month: string) => void;
}

/** Mês anterior e próximo, com o nome do mês no meio ("novembro de 2026"). */
export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mês do orçamento">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <p
        aria-live="polite"
        className="min-w-36 flex-1 text-center font-display text-lg font-semibold first-letter:uppercase"
      >
        {formatMonth(`${month}-01`)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
