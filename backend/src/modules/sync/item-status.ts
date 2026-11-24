// Situação de cada banco (item do Pluggy) traduzida para o Valora. As mensagens são do Valora, em
// português: o texto do Pluggy nunca vai para a tela.

export type ItemConnectionState =
  | { readonly status: 'ok'; readonly detail: null; readonly canReadData: true }
  | { readonly status: 'syncing'; readonly detail: string; readonly canReadData: true }
  | {
      readonly status: 'error' | 'consent_expired';
      readonly detail: string;
      readonly canReadData: false;
    };

export interface PluggyItemStatusInput {
  readonly status: string;
  readonly errorCode: string | null;
  readonly consentExpiresAt: Date | null;
}

const CONSENT_ERROR_CODES: ReadonlySet<string> = new Set(['USER_AUTHORIZATION_NOT_GRANTED']);

const OK: ItemConnectionState = { status: 'ok', detail: null, canReadData: true };

const CONSENT_EXPIRED: ItemConnectionState = {
  status: 'consent_expired',
  detail: 'O consentimento deste banco venceu ou foi revogado. Renove a conexão no Meu Pluggy.',
  canReadData: false,
};

function errorState(detail: string): ItemConnectionState {
  return { status: 'error', detail, canReadData: false };
}

const STATES_BY_PLUGGY_STATUS: Readonly<Record<string, ItemConnectionState>> = {
  UPDATED: OK,
  UPDATING: {
    status: 'syncing',
    detail: 'O Meu Pluggy está atualizando este banco agora.',
    canReadData: true,
  },
  MERGING: {
    status: 'syncing',
    detail: 'O Meu Pluggy está atualizando este banco agora.',
    canReadData: true,
  },
  LOGIN_ERROR: errorState('O acesso a este banco precisa ser refeito no Meu Pluggy.'),
  WAITING_USER_INPUT: errorState('O Meu Pluggy está esperando uma ação sua para este banco.'),
  WAITING_USER_ACTION: errorState('O Meu Pluggy está esperando uma ação sua para este banco.'),
  OUTDATED: errorState(
    'A última atualização deste banco no Meu Pluggy falhou. Ela é tentada de novo automaticamente.',
  ),
};

const UNKNOWN_STATUS = errorState('Este banco está numa situação desconhecida no Pluggy.');

export function mapItemStatus(item: PluggyItemStatusInput, now: Date): ItemConnectionState {
  const isConsentExpired = item.consentExpiresAt !== null && item.consentExpiresAt <= now;
  if (isConsentExpired) return CONSENT_EXPIRED;
  if (item.errorCode !== null && CONSENT_ERROR_CODES.has(item.errorCode)) return CONSENT_EXPIRED;
  return STATES_BY_PLUGGY_STATUS[item.status] ?? UNKNOWN_STATUS;
}

/** `complete` só quando o Pluggy diz que leu os investimentos do item até o fim. */
export type InvestmentsCollection = 'complete' | 'incomplete';

export interface PluggyCollectionInput {
  readonly status: string;
  readonly executionStatus: string | null;
  /** O SDK diz que só vem em `PARTIAL_SUCCESS`; `investments` é nulo se o produto não foi pedido. */
  readonly statusDetail: {
    readonly investments?: { readonly isUpdated?: boolean | null } | null;
  } | null;
}

/**
 * Só uma coleta completa permite zerar o investimento que sumiu da resposta. Qualquer outro caso,
 * inclusive `executionStatus` ausente ou desconhecido, é incompleto: na dúvida, não zerar.
 */
export function investmentsCollectionOf(item: PluggyCollectionInput): InvestmentsCollection {
  if (item.status !== 'UPDATED') return 'incomplete';
  if (item.executionStatus === 'SUCCESS') return 'complete';
  const hasCollectedInvestments = item.statusDetail?.investments?.isUpdated === true;
  if (item.executionStatus === 'PARTIAL_SUCCESS' && hasCollectedInvestments) return 'complete';
  return 'incomplete';
}
