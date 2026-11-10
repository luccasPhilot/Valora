import { BellOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert } from '@/lib/api/alerts';

import { AlertItem } from './alert-item';
import {
  useAlerts,
  useDismissAlert,
  useMarkAlertRead,
  useMarkAllAlertsRead,
} from './alerts-queries';

const SKELETON_ROWS = 3;
const ACTION_FAILED_MESSAGE = 'Não foi possível atualizar o alerta. Tente de novo.';
const LOAD_FAILED_MESSAGE = 'Não foi possível carregar os alertas.';

function AlertsSkeleton() {
  return (
    <div role="status" aria-label="Carregando alertas" className="space-y-4 px-4 py-3">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <BellOff className="size-5" aria-hidden="true" />
      </span>
      <p className="font-semibold">Nenhum alerta</p>
      <p className="text-sm text-muted-foreground">
        Orçamentos perto do limite e bancos que pararam de sincronizar aparecem aqui.
      </p>
    </div>
  );
}

interface AlertsErrorProps {
  onRetry: () => void;
}

function AlertsError({ onRetry }: AlertsErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="font-semibold">{LOAD_FAILED_MESSAGE}</p>
      <Button variant="outline" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

interface AlertsPanelProps {
  /** Reserva espaço à direita para o botão de fechar da folha (o painel ancorado não tem). */
  hasCloseButton?: boolean;
  /** Chamado ao abrir um alerta, para o painel fechar. */
  onOpenAlert: () => void;
}

/** O conteúdo do sino: a lista de alertas ativos com ler, dispensar e "Marcar todos como lidos". */
export function AlertsPanel({ hasCloseButton = false, onOpenAlert }: AlertsPanelProps) {
  const alertsQuery = useAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const dismiss = useDismissAlert();
  const alerts = alertsQuery.data?.items ?? [];
  const unreadCount = alertsQuery.data?.unreadCount ?? 0;
  const didActionFail = markRead.isError || markAllRead.isError || dismiss.isError;

  function handleOpen(alert: Alert) {
    if (alert.readAt === null) markRead.mutate(alert.id);
    onOpenAlert();
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className={`flex items-center justify-between gap-2 border-b px-4 py-2 ${hasCloseButton ? 'pr-14' : ''}`}
      >
        <h2 className="font-display text-lg font-bold">Alertas</h2>
        <Button
          variant="ghost"
          className="h-11 px-3"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          Marcar todos como lidos
        </Button>
      </div>
      {didActionFail ? (
        <p role="alert" className="px-4 pt-3 text-sm text-destructive">
          {ACTION_FAILED_MESSAGE}
        </p>
      ) : null}
      <div className="min-h-0 overflow-y-auto">
        {alertsQuery.isPending ? <AlertsSkeleton /> : null}
        {alertsQuery.isError ? <AlertsError onRetry={() => void alertsQuery.refetch()} /> : null}
        {alertsQuery.isSuccess && alerts.length === 0 ? <AlertsEmpty /> : null}
        {alertsQuery.isSuccess && alerts.length > 0 ? (
          <ul className="divide-y">
            {alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                now={new Date()}
                onOpen={handleOpen}
                onDismiss={(dismissed) => dismiss.mutate(dismissed.id)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
