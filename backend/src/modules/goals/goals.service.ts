import { subtractDays, todayInSaoPaulo, toSaoPauloDate } from '../../shared/dates.js';
import {
  ConflictError,
  GoalIsLinkedError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors.js';
import { estimateLinkedPace, type LinkedPaceItem, linkedSavedCents } from './goal-linked-pace.js';
import {
  estimateGoalPace,
  type GoalPaceEstimate,
  PACE_WINDOW_DAYS,
  type PaceContribution,
} from './goal-pace.js';
import { goalProgress } from './goal-progress.js';
import { type GoalStatus, goalStatus } from './goal-status.js';
import type {
  ContributionPage,
  ContributionRecord,
  GoalFields,
  GoalLinkRecord,
  GoalRecord,
  GoalsRepository,
  LinkCandidateRecord,
  LinkedItemRecord,
  LinkRef,
  LinkSnapshotRecord,
  PageRequest,
} from './goals.repository.js';

const RECENT_CONTRIBUTIONS_LIMIT = 10;
const LINKABLE_ACCOUNT_TYPES: ReadonlySet<string> = new Set(['checking', 'savings']);

export interface GoalItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly targetCents: number;
  /** Numa meta vinculada, a soma dos saldos dos itens; senão, a soma dos aportes. */
  readonly savedCents: number;
  /** A soma dos aportes guardada na meta (vale de novo se ela for desvinculada). */
  readonly manualSavedCents: number;
  readonly isLinked: boolean;
  readonly links: readonly LinkedItemRecord[];
  readonly targetDate: string | null;
  readonly progressPercent: number;
  readonly status: GoalStatus;
  readonly remainingCents: number;
  readonly monthlyRateCents: number;
  readonly requiredMonthlyCents: number | null;
  readonly estimatedDate: string | null;
  readonly isEstimateTooFar: boolean;
  readonly recentContributions: readonly ContributionRecord[];
}

export interface CreateGoalInput extends GoalFields {
  readonly initialCents: number;
  readonly links: readonly LinkRef[];
}

export interface UpdateGoalInput extends GoalFields {
  /** Ausente mantém os vínculos; lista vazia desvincula. */
  readonly links?: readonly LinkRef[];
}

export interface ContributionInput {
  readonly type: 'deposit' | 'withdrawal';
  /** Sempre positivo: o `type` diz se entra ou sai. */
  readonly amountCents: number;
  readonly date: string;
}

export interface GoalsServiceDependencies {
  readonly goals: GoalsRepository;
  readonly now: () => Date;
}

interface GoalContributions {
  readonly recent: readonly ContributionRecord[];
  readonly pace: readonly PaceContribution[];
}

interface GoalLinkedData {
  readonly links: readonly LinkedItemRecord[];
  readonly paceItems: readonly LinkedPaceItem[];
}

function groupByGoal(
  contributions: readonly ContributionRecord[],
): Map<string, ContributionRecord[]> {
  const grouped = new Map<string, ContributionRecord[]>();
  for (const contribution of contributions) {
    grouped.set(contribution.goalId, [...(grouped.get(contribution.goalId) ?? []), contribution]);
  }
  return grouped;
}

function linkKey({ type, id }: LinkRef): string {
  return `${type}:${id}`;
}

function linksValidationError(message: string): ValidationError {
  return new ValidationError(message, { details: [{ field: 'links', message }] });
}

function linkRejection(candidate: LinkCandidateRecord | undefined): string | null {
  if (!candidate) return 'Um dos itens vinculados não existe';
  if (candidate.isArchived) return `"${candidate.name}" é de um banco arquivado`;
  if (candidate.type === 'account' && !LINKABLE_ACCOUNT_TYPES.has(candidate.accountType ?? '')) {
    return `"${candidate.name}" não é conta corrente nem poupança`;
  }
  return null;
}

function groupLinkedData(
  links: readonly GoalLinkRecord[],
  snapshots: readonly LinkSnapshotRecord[],
): Map<string, GoalLinkedData> {
  const snapshotsByItem = new Map<string, LinkSnapshotRecord[]>();
  for (const snapshot of snapshots) {
    const key = linkKey(snapshot);
    snapshotsByItem.set(key, [...(snapshotsByItem.get(key) ?? []), snapshot]);
  }
  const byGoal = new Map<string, GoalLinkedData>();
  for (const { goalId, ...link } of links) {
    const current = byGoal.get(goalId) ?? { links: [], paceItems: [] };
    const paceItems = link.isArchived
      ? current.paceItems
      : [
          ...current.paceItems,
          { balanceCents: link.balanceCents, snapshots: snapshotsByItem.get(linkKey(link)) ?? [] },
        ];
    byGoal.set(goalId, { links: [...current.links, link], paceItems });
  }
  return byGoal;
}

function sortLinks(links: readonly LinkedItemRecord[]): LinkedItemRecord[] {
  return [...links].sort(
    (first, second) =>
      first.name.localeCompare(second.name, 'pt-BR') || first.id.localeCompare(second.id),
  );
}

function resolveSaving(
  record: GoalRecord,
  linked: GoalLinkedData | undefined,
  contributions: GoalContributions,
  today: string,
): { readonly savedCents: number; readonly pace: GoalPaceEstimate } {
  if (linked === undefined) {
    const pace = estimateGoalPace(
      {
        savedCents: record.savedCents,
        targetCents: record.targetCents,
        createdDate: toSaoPauloDate(record.createdAt),
      },
      contributions.pace,
      today,
    );
    return { savedCents: record.savedCents, pace };
  }
  const savedCents = linkedSavedCents(linked.links);
  const remainingCents = Math.max(0, record.targetCents - savedCents);
  return { savedCents, pace: estimateLinkedPace(linked.paceItems, remainingCents, today) };
}

function toItem(
  record: GoalRecord,
  contributions: GoalContributions,
  linked: GoalLinkedData | undefined,
  today: string,
): GoalItem {
  const { savedCents, pace } = resolveSaving(record, linked, contributions, today);
  const situation = goalStatus({ ...record, savedCents }, pace, today);
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    targetCents: record.targetCents,
    savedCents,
    manualSavedCents: record.savedCents,
    isLinked: linked !== undefined,
    links: linked === undefined ? [] : sortLinks(linked.links),
    targetDate: record.targetDate,
    progressPercent: goalProgress(savedCents, record.targetCents),
    status: situation.status,
    remainingCents: situation.remainingCents,
    monthlyRateCents: pace.monthlyRateCents,
    requiredMonthlyCents: situation.requiredMonthlyCents,
    estimatedDate: pace.estimatedDate,
    isEstimateTooFar: pace.isEstimateTooFar,
    recentContributions: contributions.recent,
  };
}

// Concluídas no fim; as demais pelo prazo mais próximo (sem prazo por último), depois pelo nome.
function compareGoals(first: GoalItem, second: GoalItem): number {
  const completionDifference =
    Number(first.status === 'completed') - Number(second.status === 'completed');
  if (completionDifference !== 0) return completionDifference;
  const dateDifference = compareTargetDates(first.targetDate, second.targetDate);
  if (dateDifference !== 0) return dateDifference;
  return first.name.localeCompare(second.name, 'pt-BR') || first.id.localeCompare(second.id);
}

function compareTargetDates(first: string | null, second: string | null): number {
  if (first === second) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return first < second ? -1 : 1;
}

export class GoalsService {
  constructor(private readonly deps: GoalsServiceDependencies) {}

  async list(): Promise<GoalItem[]> {
    const items = await this.present(await this.deps.goals.findAll());
    return items.sort(compareGoals);
  }

  async create(input: CreateGoalInput): Promise<GoalItem> {
    const { initialCents, links, ...fields } = input;
    await this.validateLinks(links);
    const record = await this.deps.goals.insert(
      fields,
      { initialCents, initialDate: this.today(), createdAt: this.deps.now() },
      links,
    );
    return this.presentOne(record);
  }

  async update(id: string, input: UpdateGoalInput): Promise<GoalItem> {
    const { links, ...fields } = input;
    if (links !== undefined) await this.validateLinks(links);
    const record = await this.deps.goals.update(id, fields, links);
    if (!record) throw new NotFoundError(`Meta ${id} não encontrada`);
    return this.presentOne(record);
  }

  async remove(id: string): Promise<void> {
    const wasRemoved = await this.deps.goals.delete(id);
    if (!wasRemoved) throw new NotFoundError(`Meta ${id} não encontrada`);
  }

  async addContribution(goalId: string, input: ContributionInput): Promise<GoalItem> {
    if (input.date > this.today()) {
      throw new ValidationError('A data do aporte não pode ser no futuro', {
        details: [{ field: 'date', message: 'Informe uma data até hoje' }],
      });
    }
    const goal = await this.requireGoal(goalId);
    await this.assertNotLinked(goal);
    const isWithdrawal = input.type === 'withdrawal';
    const updated = await this.deps.goals.addContribution(goalId, {
      date: input.date,
      amountCents: isWithdrawal ? -input.amountCents : input.amountCents,
      kind: input.type,
    });
    if (!updated) {
      throw new ValidationError(`A retirada é maior que o valor acumulado da meta "${goal.name}"`, {
        details: [{ field: 'amountCents', message: 'A retirada passa do valor acumulado' }],
      });
    }
    return this.presentOne(updated);
  }

  async removeContribution(goalId: string, contributionId: string): Promise<GoalItem> {
    await this.assertNotLinked(await this.requireGoal(goalId));
    const removal = await this.deps.goals.removeContribution(goalId, contributionId);
    if (removal === 'not_found') {
      throw new NotFoundError(`Aporte ${contributionId} não encontrado na meta ${goalId}`);
    }
    if (removal === 'would_go_below_zero') {
      throw new ConflictError(
        `Remover o aporte ${contributionId} deixaria o valor acumulado da meta ${goalId} abaixo de zero`,
      );
    }
    return this.presentOne(await this.requireGoal(goalId));
  }

  async listContributions(goalId: string, request: PageRequest): Promise<ContributionPage> {
    await this.requireGoal(goalId);
    return this.deps.goals.findContributionsPage(goalId, request);
  }

  private today(): string {
    return todayInSaoPaulo(this.deps.now());
  }

  private async requireGoal(id: string): Promise<GoalRecord> {
    const record = await this.deps.goals.findById(id);
    if (!record) throw new NotFoundError(`Meta ${id} não encontrada`);
    return record;
  }

  private async assertNotLinked(goal: GoalRecord): Promise<void> {
    if (!(await this.deps.goals.hasLinks(goal.id))) return;
    throw new GoalIsLinkedError(
      `A meta "${goal.name}" é vinculada: o valor acompanha o saldo dos itens e não aceita aporte nem retirada`,
    );
  }

  private async validateLinks(links: readonly LinkRef[]): Promise<void> {
    if (links.length === 0) return;
    if (new Set(links.map(linkKey)).size !== links.length) {
      throw linksValidationError('Há itens repetidos nos vínculos');
    }
    const candidates = await this.deps.goals.findLinkCandidates(links);
    const candidatesByKey = new Map(candidates.map((candidate) => [linkKey(candidate), candidate]));
    for (const link of links) {
      const rejection = linkRejection(candidatesByKey.get(linkKey(link)));
      if (rejection !== null) throw linksValidationError(rejection);
    }
  }

  private async presentOne(record: GoalRecord): Promise<GoalItem> {
    const [item] = await this.present([record]);
    if (!item) throw new Error(`A meta ${record.id} não foi montada`);
    return item;
  }

  // Poucas consultas para todas as metas (sem N+1): aportes recentes, aportes da janela do ritmo,
  // vínculos com o saldo atual e as fotos diárias dos itens vinculados.
  private async present(records: readonly GoalRecord[]): Promise<GoalItem[]> {
    const today = this.today();
    const goalIds = records.map((record) => record.id);
    const [recent, pace, links] = await Promise.all([
      this.deps.goals.findRecentContributions(goalIds, RECENT_CONTRIBUTIONS_LIMIT),
      this.deps.goals.findPaceContributions(goalIds, subtractDays(today, PACE_WINDOW_DAYS)),
      this.deps.goals.findLinks(goalIds),
    ]);
    const snapshots = await this.deps.goals.findLinkSnapshots(links, {
      fromDate: subtractDays(today, PACE_WINDOW_DAYS),
      beforeDate: today,
    });
    const recentByGoal = groupByGoal(recent);
    const paceByGoal = groupByGoal(pace);
    const linkedByGoal = groupLinkedData(links, snapshots);
    return records.map((record) =>
      toItem(
        record,
        { recent: recentByGoal.get(record.id) ?? [], pace: paceByGoal.get(record.id) ?? [] },
        linkedByGoal.get(record.id),
        today,
      ),
    );
  }
}
