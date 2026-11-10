import {
  Bell,
  CircleAlert,
  CopyX,
  type LucideIcon,
  Repeat,
  TriangleAlert,
  Unplug,
} from 'lucide-react';

import type { AlertTarget } from '@/lib/api/alerts';
import { formatMoment } from '@/lib/format';

const MAX_VISIBLE_UNREAD = 9;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export type AlertTone = 'warning' | 'critical' | 'neutral';

export interface AlertAppearance {
  readonly icon: LucideIcon;
  /** Nome curto do tipo: junto do ícone, a cor nunca é a única pista. */
  readonly label: string;
  readonly tone: AlertTone;
}

const APPEARANCE_BY_TYPE: Readonly<Record<string, AlertAppearance>> = {
  budget_warning: { icon: TriangleAlert, label: 'Orçamento em 80%', tone: 'warning' },
  budget_exceeded: { icon: CircleAlert, label: 'Orçamento estourado', tone: 'critical' },
  connection_error: { icon: Unplug, label: 'Banco sem sincronizar', tone: 'critical' },
  duplicate_charge: { icon: CopyX, label: 'Cobrança duplicada', tone: 'warning' },
  subscription_detected: { icon: Repeat, label: 'Assinatura', tone: 'neutral' },
};

// Tipo que a interface ainda não conhece (o backend pode ganhar tipos antes do front).
const GENERIC_APPEARANCE: AlertAppearance = { icon: Bell, label: 'Alerta', tone: 'neutral' };

export function appearanceOf(type: string): AlertAppearance {
  return APPEARANCE_BY_TYPE[type] ?? GENERIC_APPEARANCE;
}

/** O contador do sino: nada com zero, "9+" acima de 9. */
export function formatUnreadBadge(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  return unreadCount > MAX_VISIBLE_UNREAD ? `${MAX_VISIBLE_UNREAD}+` : String(unreadCount);
}

/** O nome acessível do botão do sino: "Alertas, 3 não lidos". */
export function describeBellLabel(unreadCount: number): string {
  if (unreadCount <= 0) return 'Alertas';
  return `Alertas, ${unreadCount} ${unreadCount === 1 ? 'não lido' : 'não lidos'}`;
}

/** "agora", "há 5 min", "há 3 h" e, a partir de um dia, "ontem, 07:01" ou "01/11, 07:01". */
export function describeAlertAge(createdAt: string, now: Date = new Date()): string {
  const instant = new Date(createdAt);
  const minutes = Math.floor((now.getTime() - instant.getTime()) / MS_PER_MINUTE);
  if (minutes < 1) return 'agora';
  if (minutes < MINUTES_PER_HOUR) return `há ${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `há ${hours} h`;
  return formatMoment(instant, now);
}

export interface AlertAction {
  readonly label: string;
  /** Endereço dentro do app. */
  readonly to: string;
}

/** A ação principal do alerta: ir para a tela relacionada. Sem destino, sem ação. */
export function actionFor(target: AlertTarget | null): AlertAction | null {
  if (!target) return null;
  if (target.screen === 'accounts') return { label: 'Ver contas', to: '/contas' };
  if (target.screen === 'transactions') {
    // Os filtros de data só valem no período personalizado.
    const filters = new URLSearchParams({
      period: 'custom',
      from: target.from,
      to: target.to,
      search: target.search,
    });
    return { label: 'Ver transações', to: `/transacoes?${filters.toString()}` };
  }
  return { label: 'Ver orçamento', to: `/orcamentos?month=${target.month}` };
}
