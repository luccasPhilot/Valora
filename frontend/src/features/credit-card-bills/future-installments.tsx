import { Layers } from 'lucide-react';

import { Money } from '@/components/money';
import type { InstallmentMonth } from '@/lib/api/credit-card-bills';
import { formatMonth } from '@/lib/format';

import { DashboardSection, SectionEmpty } from '../dashboard/dashboard-section';

const FULL_PERCENT = 100;

// A lista de barras numa cor só do Design System ("Gastos por categoria"): a barra de cada mês é
// proporcional ao maior mês da lista.
function barPercentOf(month: InstallmentMonth, months: readonly InstallmentMonth[]): number {
  const largestCents = Math.max(...months.map((entry) => entry.totalCents));
  return Math.round((month.totalCents / largestCents) * FULL_PERCENT);
}

/** Parcelas de compras parceladas que ainda vão chegar, somadas por mês. */
export function FutureInstallments({ months }: { months: readonly InstallmentMonth[] }) {
  return (
    <DashboardSection title="Parcelas futuras" icon={Layers}>
      {months.length === 0 ? (
        <SectionEmpty message="Nenhuma compra parcelada em andamento neste cartão." />
      ) : (
        <>
          <ul className="space-y-3">
            {months.map((month) => (
              <li key={month.month} className="space-y-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-sm">{formatMonth(month.month)}</span>
                  <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">
                    <Money cents={month.totalCents} />
                  </span>
                </span>
                <span className="block h-2 rounded-full bg-muted" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${String(barPercentOf(month, months))}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Previsão a partir das parcelas já cobradas. Compras novas ficam de fora.
          </p>
        </>
      )}
    </DashboardSection>
  );
}
