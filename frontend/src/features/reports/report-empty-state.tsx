import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';

import { LONGEST_REPORT_PERIOD, type ReportPeriod } from './report-period';
import { focusPeriodFilter } from './reports-layout';

const ACCOUNTS_PATH = '/contas';

interface ReportEmptyStateProps {
  icon: LucideIcon;
  title: string;
  period: ReportPeriod;
}

/**
 * Sem dados no período. Num período curto, vale tentar um maior; no maior, não há mais para onde
 * ir: o que falta é a sincronização trazer as transações.
 */
export function ReportEmptyState({ icon, title, period }: ReportEmptyStateProps) {
  if (period === LONGEST_REPORT_PERIOD) {
    return (
      <EmptyState
        icon={icon}
        title={title}
        description="Nem nos últimos 24 meses. As transações aparecem aqui depois da próxima sincronização com os bancos."
        action={
          <Button asChild variant="outline">
            <Link to={ACCOUNTS_PATH}>Ver contas</Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={icon}
      title={title}
      description="Tente um período maior: os dados podem estar mais para trás."
      action={
        <Button variant="outline" onClick={focusPeriodFilter}>
          Mudar período
        </Button>
      }
    />
  );
}
