import { Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { DATA_HEALTH_PATH } from './data-health-presentation';

/** Entrada discreta para a Saúde dos dados, em Ajustes e em Contas. */
export function DataHealthLink() {
  return (
    <Link
      to={DATA_HEALTH_PATH}
      className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-card outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Activity className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Saúde dos dados</span>
        <span className="block text-xs text-muted-foreground">
          Consentimentos, conciliação do saldo e sincronizações
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
