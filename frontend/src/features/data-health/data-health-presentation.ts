import { CircleCheck, CircleX, LoaderCircle, type LucideIcon, TriangleAlert } from 'lucide-react';

import type {
  BalanceDivergence,
  ConsentStatus,
  DataHealth,
  StaleAccount,
} from '@/lib/api/data-health';
import type { SyncRunHistoryItem, SyncRunStatus } from '@/lib/api/sync';
import { toSaoPauloDate } from '@/lib/dates';
import { formatDate, formatIsoDayMonth, formatMoment } from '@/lib/format';

export const DATA_HEALTH_PATH = '/ajustes/saude-dos-dados';

// O mesmo prazo do primeiro aviso do sino.
const CONSENT_NOTICE_DAYS = 30;

export function isConsentExpiringSoon(consent: ConsentStatus): boolean {
  return consent.daysLeft !== null && consent.daysLeft <= CONSENT_NOTICE_DAYS;
}

function inDays(days: number): string {
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

/** "Vence em 28/12/2026 (em 34 dias)", "Venceu em 01/11/2026" ou "O banco não informou o vencimento". */
export function describeConsent(consent: ConsentStatus): string {
  if (consent.expiresAt === null || consent.daysLeft === null) {
    return 'O banco não informou o vencimento';
  }
  const date = formatDate(toSaoPauloDate(new Date(consent.expiresAt)));
  if (consent.daysLeft < 0) return `Venceu em ${date}`;
  if (consent.daysLeft > CONSENT_NOTICE_DAYS) return `Vence em ${date}`;
  return `Vence em ${date} (${inDays(consent.daysLeft)})`;
}

export function describeDivergence(divergence: BalanceDivergence): string {
  const from = formatIsoDayMonth(divergence.from);
  const to = formatIsoDayMonth(divergence.to);
  return `Possível transação faltando entre ${from} e ${to}`;
}

/** Transações daquela conta, do primeiro ao último dia do período. */
export function divergenceTransactionsPath(divergence: BalanceDivergence): string {
  const filters = new URLSearchParams({
    period: 'custom',
    from: divergence.from,
    to: divergence.to,
    account: divergence.accountId,
  });
  return `/transacoes?${filters.toString()}`;
}

export function describeStaleAccount(account: StaleAccount): string {
  return `Sem transações há ${account.daysWithoutTransactions} dias`;
}

export function describeLastTransaction(account: StaleAccount): string {
  if (account.lastTransactionDate === null) return 'Nenhuma transação ainda';
  return `Última em ${formatIsoDayMonth(account.lastTransactionDate)}`;
}

/** Quantos pontos pedem conferência: consentimento a vencer, divergência e conta parada. */
export function countAttentionPoints(dataHealth: DataHealth): number {
  return (
    dataHealth.consents.filter(isConsentExpiringSoon).length +
    dataHealth.divergences.length +
    dataHealth.staleAccounts.length
  );
}

export function describeAttention(count: number): string {
  if (count === 0) return 'Tudo certo com os dados';
  return count === 1 ? '1 ponto para conferir' : `${count} pontos para conferir`;
}

/** "Hoje, 07:02", "Ontem, 07:01" ou "01/11, 07:01". */
export function describeSyncMoment(startedAt: string, now: Date = new Date()): string {
  const moment = formatMoment(new Date(startedAt), now);
  return moment.charAt(0).toUpperCase() + moment.slice(1);
}

/** "Agendada · 12 novas, 3 atualizadas"; sem contagens, só como começou. */
export function describeSyncRun(run: SyncRunHistoryItem): string {
  const counts = describeSyncCounts(run.stats);
  const trigger = describeSyncTrigger(run.trigger);
  return counts ? `${trigger} · ${counts}` : trigger;
}

export function describeSyncTrigger(trigger: SyncRunHistoryItem['trigger']): string {
  return trigger === 'schedule' ? 'Agendada' : 'Botão';
}

export interface SyncResultAppearance {
  readonly icon: LucideIcon;
  /** Sempre junto do ícone: a cor nunca é a única pista. */
  readonly label: string;
  readonly iconClass: string;
}

const SYNC_RESULTS: Readonly<Record<SyncRunStatus, SyncResultAppearance>> = {
  success: { icon: CircleCheck, label: 'Concluída', iconClass: 'text-primary' },
  // Curtos para caber à direita da linha a 320 px; o motivo vai na linha de detalhe.
  partial: { icon: TriangleAlert, label: 'Parcial', iconClass: 'text-warning' },
  failed: { icon: CircleX, label: 'Falhou', iconClass: 'text-destructive' },
  running: { icon: LoaderCircle, label: 'Rodando', iconClass: 'text-muted-foreground' },
};

export function syncResultOf(status: SyncRunStatus): SyncResultAppearance {
  return SYNC_RESULTS[status];
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "12 novas, 3 atualizadas"; nulo enquanto a execução não terminou ou quando falhou antes de contar. */
export function describeSyncCounts(stats: SyncRunHistoryItem['stats']): string | null {
  if (!stats) return null;
  const inserted = countLabel(stats.transactionsInserted, 'nova', 'novas');
  const updated = countLabel(stats.transactionsUpdated, 'atualizada', 'atualizadas');
  return `${inserted}, ${updated}`;
}
