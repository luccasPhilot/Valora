import { cn } from 'cn';
import { Check } from 'lucide-react';
import { type KeyboardEvent, useId } from 'react';

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
  /** Falso quando o contexto já nomeia o grupo: o rótulo continua para leitores de tela. */
  isLabelVisible?: boolean;
  /** Largura do grupo; por padrão ele ocupa a linha toda. */
  className?: string;
}

const SELECTED_OPTION_CLASSES = 'bg-secondary text-secondary-foreground hover:bg-secondary';
const OPTION_STEP_BY_KEY: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Controle segmentado do Design System: a opção escolhida leva fundo `secondary` e um check. Segue o
 * padrão de rádio do ARIA: uma parada de Tab no grupo e as setas movem a escolha.
 */
export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  isLabelVisible = true,
  className,
}: SegmentedControlProps<TValue>) {
  const labelId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabbableIndex = Math.max(selectedIndex, 0);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = OPTION_STEP_BY_KEY[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const nextIndex = (tabbableIndex + step + options.length) % options.length;
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    onChange(nextOption.value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[nextIndex]?.focus();
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span
        id={labelId}
        className={cn('text-sm leading-5 font-medium', !isLabelVisible && 'sr-only')}
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 rounded-3xl border bg-card p-1 max-[360px]:grid max-[360px]:grid-cols-2"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={index === tabbableIndex ? 0 : -1}
              variant="ghost"
              className={cn(
                'flex-1 rounded-full px-1.5 has-[>svg]:px-1.5 sm:px-3 sm:has-[>svg]:px-3',
                isSelected && SELECTED_OPTION_CLASSES,
              )}
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
