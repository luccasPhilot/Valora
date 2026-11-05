import { CircleAlert, CircleCheck, type LucideIcon, RefreshCw, TriangleAlert } from 'lucide-react';

import type { ConnectionStatus } from '@/lib/api/accounts';

interface StatusStyle {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly classes: string;
}

// Sempre ícone + texto, nunca só a cor (Design System, "Status de conexão").
const STATUS_STYLES: Readonly<Record<ConnectionStatus, StatusStyle>> = {
  ok: { label: 'Conectado', icon: CircleCheck, classes: 'bg-secondary text-secondary-foreground' },
  syncing: {
    label: 'Sincronizando',
    icon: RefreshCw,
    classes: 'bg-secondary text-secondary-foreground',
  },
  error: { label: 'Erro', icon: CircleAlert, classes: 'bg-warning-surface text-destructive' },
  consent_expired: {
    label: 'Consentimento expirado',
    icon: TriangleAlert,
    classes: 'bg-warning-surface text-warning',
  },
};

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { label, icon: Icon, classes } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
