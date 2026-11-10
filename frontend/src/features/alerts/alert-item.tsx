import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import type { Alert } from '@/lib/api/alerts';

import { actionFor, type AlertTone, appearanceOf, describeAlertAge } from './alert-presentation';

const ICON_TONE_CLASSES: Readonly<Record<AlertTone, string>> = {
  warning: 'bg-warning-surface text-status-warning',
  critical: 'bg-muted text-status-critical',
  neutral: 'bg-secondary text-primary',
};

interface AlertItemProps {
  alert: Alert;
  now: Date;
  /** Abrir o alerta (ir para a tela relacionada ou marcar como lido) o marca como lido. */
  onOpen: (alert: Alert) => void;
  onDismiss: (alert: Alert) => void;
}

export function AlertItem({ alert, now, onOpen, onDismiss }: AlertItemProps) {
  const { icon: Icon, label, tone } = appearanceOf(alert.type);
  const action = actionFor(alert.target);
  const isUnread = alert.readAt === null;

  return (
    <li className="flex gap-3 px-4 py-3">
      <span
        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${ICON_TONE_CLASSES[tone]}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {isUnread ? (
            <>
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="sr-only">Não lido. </span>
            </>
          ) : null}
          <span>{label}</span>
          <span aria-hidden="true">·</span>
          <span>{describeAlertAge(alert.createdAt, now)}</span>
        </p>
        <p className={`mt-0.5 text-sm break-words ${isUnread ? 'font-semibold' : ''}`}>
          {alert.message}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {action ? (
            <Button asChild variant="outline" className="h-11 px-3">
              <Link to={action.to} onClick={() => onOpen(alert)}>
                {action.label}
              </Link>
            </Button>
          ) : null}
          {!action && isUnread ? (
            <Button variant="outline" className="h-11 px-3" onClick={() => onOpen(alert)}>
              Marcar como lido
            </Button>
          ) : null}
          {/* Sozinho na linha, o texto alinha com a mensagem (o padding do botão fantasma não aparece). */}
          <Button
            variant="ghost"
            className={`h-11 px-3 ${action || isUnread ? '' : '-ml-3'}`}
            onClick={() => onDismiss(alert)}
          >
            Dispensar
          </Button>
        </div>
      </div>
    </li>
  );
}
