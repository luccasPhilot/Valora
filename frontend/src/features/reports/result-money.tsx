import { TonedMoney } from '@/components/toned-money';

interface ResultMoneyProps {
  cents: number;
}

/** Resultado do período ou do mês, com sinal: verde se sobrou, vermelho só se faltou (sempre com o sinal, nunca só a cor). */
export function ResultMoney({ cents }: ResultMoneyProps) {
  return <TonedMoney cents={cents} kind="result" isSigned />;
}
