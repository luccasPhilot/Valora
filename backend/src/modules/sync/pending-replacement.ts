import { daysBetween } from '../../shared/dates.js';

/** A postada costuma vir com a data da pendente ou alguns dias depois; o dia antes cobre a data em UTC. */
export const PENDING_MATCH_DAYS_BEFORE = 1;
export const PENDING_MATCH_DAYS_AFTER = 5;
/** Quanto tempo a pendente com decisão do usuário espera pela postada depois de sumir do Pluggy. */
export const PENDING_GRACE_DAYS = 5;

/** Transação do Open Finance vista pela troca: só o que a regra compara. */
export interface ReplacementTransaction {
  readonly id: string;
  /** AAAA-MM-DD */
  readonly date: string;
  readonly amountCents: number;
  readonly createdAt: Date;
}

export interface PendingReplacementInput {
  /** Pendentes da conta que sumiram do Pluggy e têm decisão do usuário. */
  readonly vanishedPendings: readonly ReplacementTransaction[];
  /** Postadas do Open Finance da mesma conta que podem ter substituído alguma delas. */
  readonly postedCandidates: readonly ReplacementTransaction[];
  /** Hoje em São Paulo, AAAA-MM-DD. */
  readonly today: string;
}

export interface PendingReplacement {
  readonly pendingId: string;
  readonly postedId: string;
}

export interface PendingReplacementPlan {
  /** Pendente → postada que herda a decisão. A pendente é apagada depois. */
  readonly replacements: readonly PendingReplacement[];
  /** Pendentes sem candidata única que ainda estão no prazo: não são apagadas. */
  readonly keptPendingIds: readonly string[];
  /** Pendentes com duas ou mais candidatas na menor distância. */
  readonly ties: number;
}

type CandidateChoice =
  | { readonly kind: 'found'; readonly postedId: string }
  | { readonly kind: 'none' }
  | { readonly kind: 'tie' };

function byDateThenId(left: ReplacementTransaction, right: ReplacementTransaction): number {
  return left.date.localeCompare(right.date) || left.id.localeCompare(right.id);
}

function isEquivalent(pending: ReplacementTransaction, posted: ReplacementTransaction): boolean {
  const offset = daysBetween(pending.date, posted.date);
  return (
    posted.amountCents === pending.amountCents &&
    offset >= -PENDING_MATCH_DAYS_BEFORE &&
    offset <= PENDING_MATCH_DAYS_AFTER &&
    posted.createdAt >= pending.createdAt
  );
}

// Empate não leva: dar a categoria a uma compra por sorte é pior do que esperar.
function chooseCandidate(
  pending: ReplacementTransaction,
  candidates: readonly ReplacementTransaction[],
): CandidateChoice {
  const distanceOf = (posted: ReplacementTransaction) =>
    Math.abs(daysBetween(pending.date, posted.date));
  const equivalents = candidates.filter((posted) => isEquivalent(pending, posted));
  if (equivalents.length === 0) return { kind: 'none' };
  const closestDistance = Math.min(...equivalents.map(distanceOf));
  const closest = equivalents.filter((posted) => distanceOf(posted) === closestDistance);
  const [only] = closest;
  if (closest.length > 1 || !only) return { kind: 'tie' };
  return { kind: 'found', postedId: only.id };
}

/**
 * Decide, para cada pendente que sumiu com decisão do usuário, qual postada herda essa decisão.
 * Cada postada serve a uma pendente só; as pendentes são vistas em ordem de data e id.
 */
export function matchVanishedPending({
  vanishedPendings,
  postedCandidates,
  today,
}: PendingReplacementInput): PendingReplacementPlan {
  const replacements: PendingReplacement[] = [];
  const keptPendingIds: string[] = [];
  const chosenPostedIds = new Set<string>();
  let ties = 0;
  for (const pending of [...vanishedPendings].sort(byDateThenId)) {
    const available = postedCandidates.filter((posted) => !chosenPostedIds.has(posted.id));
    const choice = chooseCandidate(pending, available);
    if (choice.kind === 'found') {
      chosenPostedIds.add(choice.postedId);
      replacements.push({ pendingId: pending.id, postedId: choice.postedId });
      continue;
    }
    if (choice.kind === 'tie') ties += 1;
    if (daysBetween(pending.date, today) <= PENDING_GRACE_DAYS) keptPendingIds.push(pending.id);
  }
  return { replacements, keptPendingIds, ties };
}
