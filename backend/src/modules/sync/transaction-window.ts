import { subtractDays, todayInSaoPaulo, toSaoPauloDate } from '../../shared/dates.js';
import type { TransactionWindow } from './sync.types.js';

/** O Open Finance guarda até 12 meses: é o máximo que vale pedir. */
export const FIRST_SYNC_DAYS = 365;
/** Pendentes do cartão mudam ou somem dentro deste prazo, então a janela nunca é menor. */
export const MIN_SYNC_DAYS = 30;
/** Cobre a transação lançada com data anterior à da última leitura (postagem atrasada, data em UTC). */
export const RESUME_MARGIN_DAYS = 7;

/**
 * Janela de transações de um banco: 365 dias na primeira vez; depois, a partir do dia da última
 * sincronização bem-sucedida menos a margem, com pelo menos 30 dias e no máximo 365.
 */
export function transactionWindowFor(lastSyncedAt: Date | null, now: Date): TransactionWindow {
  const today = todayInSaoPaulo(now);
  const oldestAllowed = subtractDays(today, FIRST_SYNC_DAYS);
  if (lastSyncedAt === null) return { from: oldestAllowed, to: today };
  const resumeFrom = subtractDays(toSaoPauloDate(lastSyncedAt), RESUME_MARGIN_DAYS);
  const latestAllowed = subtractDays(today, MIN_SYNC_DAYS);
  // Datas AAAA-MM-DD comparam como texto na mesma ordem do calendário.
  const atLeastMinimum = resumeFrom < latestAllowed ? resumeFrom : latestAllowed;
  const from = atLeastMinimum > oldestAllowed ? atLeastMinimum : oldestAllowed;
  return { from, to: today };
}
