import { cn } from 'cn';
import { type ComponentProps, useLayoutEffect, useRef } from 'react';

import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { digitsToCents, extractMoneyDigits } from '@/lib/money-digits';

const EMPTY_PLACEHOLDER = formatCurrency(0);

interface MoneyInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> {
  /** Só os dígitos digitados, sem zeros à esquerda ("8990" é R$ 89,90). Vazio é "sem valor". */
  digits: string;
  onDigitsChange: (digits: string) => void;
}

/**
 * Campo de valor "da direita para a esquerda", como nos apps de banco: digitar 8, 9, 9, 0 mostra
 * R$ 89,90 e apagar um dígito mostra R$ 8,99. O teclado é o numérico.
 */
export function MoneyInput({ digits, onDigitsChange, className, ...props }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const text = digits === '' ? '' : formatCurrency(digitsToCents(digits));

  // A digitação sempre acontece no fim do valor: o cursor volta para lá depois de cada mudança.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input)
      input.setSelectionRange(text.length, text.length);
  }, [text]);

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={EMPTY_PLACEHOLDER}
      value={text}
      onChange={(event) => {
        const nextDigits = extractMoneyDigits(event.target.value);
        if (nextDigits !== null) onDigitsChange(nextDigits);
      }}
      className={cn(
        'h-14 font-display text-2xl font-bold tracking-tight tabular-nums lg:text-2xl',
        className,
      )}
    />
  );
}
