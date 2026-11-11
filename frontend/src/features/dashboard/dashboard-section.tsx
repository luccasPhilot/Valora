import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { DataCard } from '@/components/cards/data-card';

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  /** Link ou botão do canto do cabeçalho, como "Ver todas". */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Bloco do Início: o `DataCard` do Design System (título pequeno e apagado, conteúdo com o peso). */
export function DashboardSection({
  title,
  icon,
  action,
  className,
  children,
}: DashboardSectionProps) {
  return (
    <DataCard title={title} icon={icon} action={action} className={className}>
      {children}
    </DataCard>
  );
}

interface SectionLinkProps {
  to: string;
  children: ReactNode;
}

export function SectionLink({ to, children }: SectionLinkProps) {
  return (
    <Link
      to={to}
      className="-my-3 inline-flex min-h-11 shrink-0 items-center rounded-md px-1 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

interface SectionEmptyProps {
  message: string;
  action?: ReactNode;
}

/** Bloco sem dados no mês: uma frase e, se houver, a ação que resolve. */
export function SectionEmpty({ message, action }: SectionEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 py-2">
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
