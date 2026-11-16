import { cn } from 'cn';

import { Money } from '@/components/money';

interface ResultMoneyProps {
  cents: number;
}

/** Resultado do período ou do mês, com sinal: verde se sobrou, vermelho só se faltou (sempre com o sinal, nunca só a cor). */
export function ResultMoney({ cents }: ResultMoneyProps) {
  return (
    <span className={cn(cents > 0 && 'text-positive', cents < 0 && 'text-destructive')}>
      <Money cents={cents} isSigned />
    </span>
  );
}
