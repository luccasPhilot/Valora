import { TriangleAlert } from 'lucide-react';

import { Money } from '@/components/money';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { GoalLink, GoalLinkRef } from '@/lib/api/goals';

import { useAccountsOverview } from '../accounts/accounts-queries';
import { useInvestments } from '../investments/investments-queries';
import { MAX_GOAL_LINKS } from './goal-form-values';
import { useGoals } from './goals-queries';
import {
  buildLinkCandidates,
  type LinkCandidate,
  linkKey,
  linkKeysInOtherGoals,
  sumSelectedCents,
  toggleLink,
} from './link-candidates';

const SKELETON_ROWS = 3;

interface LinkPickerProps {
  selected: readonly GoalLinkRef[];
  onChange: (links: GoalLinkRef[]) => void;
  /** Nulo na meta nova: nenhum vínculo é "da própria meta". */
  currentGoalId: string | null;
  currentLinks: readonly GoalLink[];
  errorId: string;
  errorMessage: string | undefined;
}

function LinkError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface CandidateRowProps {
  candidate: LinkCandidate;
  isChecked: boolean;
  isDisabled: boolean;
  isInOtherGoal: boolean;
  onToggle: () => void;
}

function CandidateRow({
  candidate,
  isChecked,
  isDisabled,
  isInOtherGoal,
  onToggle,
}: CandidateRowProps) {
  return (
    <li>
      <label
        className={`flex min-h-11 items-start gap-3 rounded-md border bg-card p-3 text-sm ${
          isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-accent'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={isDisabled}
          onChange={onToggle}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="min-w-0">
            <span className="block font-medium break-words">{candidate.name}</span>
            {candidate.institutionName ? (
              <span className="block break-words text-muted-foreground">
                {candidate.institutionName}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 tabular-nums">
            <Money cents={candidate.balanceCents} />
          </span>
          {isInOtherGoal ? (
            <span className="flex basis-full items-start gap-2 text-muted-foreground">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-status-warning"
                aria-hidden="true"
              />
              Já está em outra meta: o saldo conta inteiro nas duas.
            </span>
          ) : null}
        </span>
      </label>
    </li>
  );
}

interface CandidateGroupProps {
  title: string;
  candidates: readonly LinkCandidate[];
  selected: readonly GoalLinkRef[];
  otherGoalKeys: ReadonlySet<string>;
  onChange: (links: GoalLinkRef[]) => void;
}

function CandidateGroup({
  title,
  candidates,
  selected,
  otherGoalKeys,
  onChange,
}: CandidateGroupProps) {
  if (candidates.length === 0) return null;
  const chosen = new Set(selected.map(linkKey));
  const isFull = selected.length >= MAX_GOAL_LINKS;
  return (
    <section aria-label={title} className="space-y-2">
      <h4 className="type-label px-1">{title}</h4>
      <ul className="space-y-2">
        {candidates.map((candidate) => {
          const isChecked = chosen.has(linkKey(candidate));
          return (
            <CandidateRow
              key={linkKey(candidate)}
              candidate={candidate}
              isChecked={isChecked}
              isDisabled={isFull && !isChecked}
              isInOtherGoal={otherGoalKeys.has(linkKey(candidate))}
              onToggle={() => onChange(toggleLink(selected, candidate))}
            />
          );
        })}
      </ul>
    </section>
  );
}

/** Contas (corrente e poupança) e investimentos de bancos ativos, com caixa de seleção e a soma atual. */
export function LinkPicker({
  selected,
  onChange,
  currentGoalId,
  currentLinks,
  errorId,
  errorMessage,
}: LinkPickerProps) {
  const accountsQuery = useAccountsOverview();
  const investmentsQuery = useInvestments();
  const goalsQuery = useGoals();

  if (accountsQuery.isError || investmentsQuery.isError) {
    return (
      <div role="alert" className="space-y-2 text-sm">
        <p className="text-destructive">Não foi possível carregar suas contas e investimentos.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void accountsQuery.refetch();
            void investmentsQuery.refetch();
          }}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!accountsQuery.isSuccess || !investmentsQuery.isSuccess) {
    return <RowsSkeleton rowCount={SKELETON_ROWS} />;
  }

  const groups = buildLinkCandidates(accountsQuery.data, investmentsQuery.data, currentLinks);
  if (groups.accounts.length === 0 && groups.investments.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Nenhuma conta corrente, poupança ou investimento para vincular ainda.
        </p>
        <LinkError id={errorId} message={errorMessage} />
      </div>
    );
  }
  const otherGoalKeys = linkKeysInOtherGoals(goalsQuery.data ?? [], currentGoalId);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        O valor da meta passa a ser a soma dos saldos que você marcar. Escolha até {MAX_GOAL_LINKS}.
      </p>
      <CandidateGroup
        title="Contas"
        candidates={groups.accounts}
        selected={selected}
        otherGoalKeys={otherGoalKeys}
        onChange={onChange}
      />
      <CandidateGroup
        title="Investimentos"
        candidates={groups.investments}
        selected={selected}
        otherGoalKeys={otherGoalKeys}
        onChange={onChange}
      />
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium tabular-nums">
        <span>Soma atual</span>
        <Money cents={sumSelectedCents(groups, selected)} />
      </p>
      <LinkError id={errorId} message={errorMessage} />
    </div>
  );
}
