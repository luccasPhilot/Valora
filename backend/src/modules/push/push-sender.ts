export interface PushPayload {
  readonly title: string;
  readonly body: string;
  /** Caminho dentro do app que a notificação abre ao ser tocada. */
  readonly url: string;
}

export interface PushSubscriptionRecord {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

/** `gone`: o serviço de push diz que a inscrição não existe mais (404 ou 410). */
export type PushSendResult = 'sent' | 'gone' | 'failed';

/** A única parte que fala com o serviço de push. Nunca lança: a falha vira `failed`. */
export interface PushSender {
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<PushSendResult>;
}
