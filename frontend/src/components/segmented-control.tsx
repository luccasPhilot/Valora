import { Check } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';

export interface SegmentedOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

interface SegmentedControlProps<TValue extends string> {
  label: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

const SELECTED_OPTION_CLASSES = 'bg-secondary text-secondary-foreground hover:bg-secondary';

/** Controle segmentado do Design System: a opção escolhida leva fundo `secondary` e um check. */
export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<TValue>) {
  const labelId = useId();
  return (
    <div className="space-y-2">
      <span id={labelId} className="text-sm leading-5 font-medium">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1 rounded-3xl border bg-card p-1"
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              variant="ghost"
              className={`flex-1 rounded-full ${isSelected ? SELECTED_OPTION_CLASSES : ''}`}
              onClick={() => onChange(option.value)}
            >
              {isSelected ? <Check aria-hidden="true" /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
