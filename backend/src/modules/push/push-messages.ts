import type { PushPayload } from './push-sender.js';

export const PUSH_TITLE = 'Valora';

/** Abre o app com o painel de alertas (o sino) aberto. */
export const ALERTS_PUSH_URL = '/?alertas=1';
const REVIEW_INBOX_PUSH_URL = '/transacoes/revisar';

const UNKNOWN_ALERT_TEXT = 'Alerta novo no Valora';

// Textos fixos por tipo: nunca levam valor, descrição nem nome de categoria, banco, conta ou meta.
const ALERT_TEXTS: Readonly<Record<string, string>> = {
  budget_warning: 'Um orçamento chegou a 80%',
  budget_exceeded: 'Um orçamento passou do limite',
  connection_error: 'Um banco parou de sincronizar',
  duplicate_charge: 'Possível cobrança duplicada',
  subscription_detected: 'Assinatura nova encontrada',
  consent_expiring: 'Um consentimento vence em breve',
  year_end_snapshot_pending: 'Falta a foto de 31/12',
  year_end_snapshot_missing: 'Falta a foto de 31/12',
};

export const REVIEW_INBOX_PUSH: PushPayload = {
  title: PUSH_TITLE,
  body: 'Há transações para revisar',
  url: REVIEW_INBOX_PUSH_URL,
};

function alertText(type: string): string {
  return (Object.hasOwn(ALERT_TEXTS, type) ? ALERT_TEXTS[type] : undefined) ?? UNKNOWN_ALERT_TEXT;
}

/** Um alerta novo vira o texto do tipo; dois ou mais, a contagem. */
export function newAlertsPush(types: readonly string[]): PushPayload {
  const [firstType] = types;
  const body =
    types.length === 1 && firstType !== undefined
      ? alertText(firstType)
      : `${types.length} alertas novos no Valora`;
  return { title: PUSH_TITLE, body, url: ALERTS_PUSH_URL };
}
