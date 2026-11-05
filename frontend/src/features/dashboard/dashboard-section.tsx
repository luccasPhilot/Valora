import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router';

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  /** Link ou botão do canto do cabeçalho, como "Ver todas". */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Card de um bloco do Início: título no estilo `label` com ícone em `primary` (Design System). */
export function DashboardSection({
  title,
  icon: Icon,
  action,
  className,
  children,
}: DashboardSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex h-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="type-label flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
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
