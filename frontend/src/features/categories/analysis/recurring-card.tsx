import { Repeat } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import type { CategoryInsights } from '@/lib/api/category-insights';
import { formatIsoDayMonth } from '@/lib/format';

const NOTE =
  'Mostra as cobranças de hoje, não as do mês escolhido. Só detecta cobranças de mesmo valor: se o preço mudar, ela volta a aparecer depois de três cobranças no novo valor.';

function describeCount(chargesCount: number): string {
  return `${chargesCount} cobranças`;
}

/**
 * Assinaturas e cobranças mensais detectadas pela mesma regra do alerta, com o que isso custa por
 * mês e por ano. Mostra a situação de hoje, qualquer que seja o mês analisado.
 */
export function RecurringCard({ recurring }: { recurring: CategoryInsights['recurring'] }) {
  return (
    <DataCard title="Cobranças recorrentes" icon={Repeat} className="h-auto">
      {recurring.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança recorrente detectada.</p>
      ) : (
        <>
          <Metric
            size="md"
            value={
              <>
                <Money cents={recurring.monthlyTotalCents} /> por mês
              </>
            }
            caption={
              <>
                <Money cents={recurring.yearlyTotalCents} /> por ano em {recurring.items.length}{' '}
                {recurring.items.length === 1 ? 'cobrança' : 'cobranças'}
              </>
            }
          />
          <ul className="divide-y">
            {recurring.items.map((item) => (
              <li
                key={`${item.description}:${item.amountCents}`}
                className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 block font-medium break-words">
                    {item.description}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {describeCount(item.chargesCount)}, a última em{' '}
                    {formatIsoDayMonth(item.lastChargeDate)}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">
                  <Money cents={-item.amountCents} isSigned />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">{NOTE}</p>
    </DataCard>
  );
}
