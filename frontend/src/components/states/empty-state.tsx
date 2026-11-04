import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="max-w-prose text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
