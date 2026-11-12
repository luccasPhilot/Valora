import type { AccountsOverview } from '@/lib/api/accounts';
import type { Goal, GoalLink, GoalLinkRef } from '@/lib/api/goals';
import type { Investments } from '@/lib/api/investments';

/** Conta ou investimento que dá para vincular a uma meta, com o saldo de agora. */
export interface LinkCandidate extends GoalLinkRef {
  readonly name: string;
  readonly institutionName: string | null;
  readonly balanceCents: number;
}

export interface LinkCandidateGroups {
  readonly accounts: readonly LinkCandidate[];
  readonly investments: readonly LinkCandidate[];
}

const LINKABLE_ACCOUNT_TYPES: ReadonlySet<string> = new Set(['checking', 'savings']);

export function linkKey({ type, id }: GoalLinkRef): string {
  return `${type}:${id}`;
}

function accountCandidates(overview: AccountsOverview): LinkCandidate[] {
  return overview.items.flatMap((account) =>
    LINKABLE_ACCOUNT_TYPES.has(account.type) && account.balanceCents !== null
      ? [
          {
            type: 'account' as const,
            id: account.id,
            name: account.name,
            institutionName: account.connection?.institutionName ?? null,
            balanceCents: account.balanceCents,
          },
        ]
      : [],
  );
}

function investmentCandidates(investments: Investments): LinkCandidate[] {
  return investments.groups.flatMap((group) =>
    group.items.map((item) => ({
      type: 'investment' as const,
      id: item.id,
      name: item.name,
      institutionName: item.institutionName,
      balanceCents: item.balanceCents,
    })),
  );
}

// Um item já vinculado pode ter saído das listas (investimento resgatado e zerado):
// ele continua marcado e dá para tirá-lo da meta.
function withCurrentLinks(
  candidates: readonly LinkCandidate[],
  currentLinks: readonly GoalLink[],
  type: GoalLinkRef['type'],
): LinkCandidate[] {
  const known = new Set(candidates.map(linkKey));
  const missing = currentLinks
    .filter((link) => link.type === type && !link.isArchived && !known.has(linkKey(link)))
    .map(({ type: linkType, id, name, institutionName, balanceCents }) => ({
      type: linkType,
      id,
      name,
      institutionName,
      balanceCents,
    }));
  return [...candidates, ...missing];
}

export function buildLinkCandidates(
  overview: AccountsOverview,
  investments: Investments,
  currentLinks: readonly GoalLink[],
): LinkCandidateGroups {
  return {
    accounts: withCurrentLinks(accountCandidates(overview), currentLinks, 'account'),
    investments: withCurrentLinks(investmentCandidates(investments), currentLinks, 'investment'),
  };
}

/** A soma dos saldos de agora dos itens escolhidos. */
export function sumSelectedCents(
  groups: LinkCandidateGroups,
  selected: readonly GoalLinkRef[],
): number {
  const chosen = new Set(selected.map(linkKey));
  return [...groups.accounts, ...groups.investments]
    .filter((candidate) => chosen.has(linkKey(candidate)))
    .reduce((sum, { balanceCents }) => sum + balanceCents, 0);
}

/** Os itens que outras metas já acompanham (o mesmo item conta inteiro em cada meta). */
export function linkKeysInOtherGoals(
  goals: readonly Goal[],
  currentGoalId: string | null,
): ReadonlySet<string> {
  return new Set(
    goals.filter((goal) => goal.id !== currentGoalId).flatMap((goal) => goal.links.map(linkKey)),
  );
}

export function toggleLink(
  selected: readonly GoalLinkRef[],
  candidate: GoalLinkRef,
): GoalLinkRef[] {
  const key = linkKey(candidate);
  if (selected.some((link) => linkKey(link) === key)) {
    return selected.filter((link) => linkKey(link) !== key);
  }
  return [...selected, { type: candidate.type, id: candidate.id }];
}
