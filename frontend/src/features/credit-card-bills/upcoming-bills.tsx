import { CalendarDays } from 'lucide-react';

import { Money } from '@/components/money';
import type { Bill } from '@/lib/api/credit-card-bills';

import { DashboardSection, SectionEmpty } from '../dashboard/dashboard-section';
import { describeDueDate } from './bill-labels';
import { BillStatusBadge } from './bill-status-badge';

/** As próximas faturas já fechadas pelo banco. O Valora nunca inventa uma fatura que o banco não mandou. */
export function UpcomingBills({ bills }: { bills: readonly Bill[] }) {
  return (
    <DashboardSection title="Próximas faturas" icon={CalendarDays}>
      {bills.length === 0 ? (
        <SectionEmpty message="O banco ainda não enviou as próximas faturas." />
      ) : (
        <ul className="divide-y divide-border">
          {bills.map((bill) => (
            <li
              key={bill.id ?? bill.dueDate}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex min-w-0 flex-col items-start gap-1.5">
                <span className="text-sm">{describeDueDate(bill)}</span>
                <BillStatusBadge status={bill.status} />
              </span>
              <span className="font-display font-semibold whitespace-nowrap tabular-nums">
                <Money cents={bill.totalCents} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
