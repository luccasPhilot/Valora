import { subtractDays, todayInSaoPaulo, toSaoPauloDate } from '../../shared/dates.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { estimateGoalPace, PACE_WINDOW_DAYS, type PaceContribution } from './goal-pace.js';
import { goalProgress } from './goal-progress.js';
import { type GoalStatus, goalStatus } from './goal-status.js';
import type {
  ContributionPage,
  ContributionRecord,
  GoalFields,
  GoalRecord,
  GoalsRepository,
  PageRequest,
} from './goals.repository.js';

const RECENT_CONTRIBUTIONS_LIMIT = 10;

export interface GoalItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly targetCents: number;
  readonly savedCents: number;
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

function groupByGoal(
  contributions: readonly ContributionRecord[],
): Map<string, ContributionRecord[]> {
  const grouped = new Map<string, ContributionRecord[]>();
  for (const contribution of contributions) {
    grouped.set(contribution.goalId, [...(grouped.get(contribution.goalId) ?? []), contribution]);
  }
  return grouped;
}

function toItem(record: GoalRecord, contributions: GoalContributions, today: string): GoalItem {
  const pace = estimateGoalPace(
    {
      savedCents: record.savedCents,
      targetCents: record.targetCents,
      createdDate: toSaoPauloDate(record.createdAt),
    },
    contributions.pace,
    today,
  );
  const situation = goalStatus(record, pace, today);
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    targetCents: record.targetCents,
    savedCents: record.savedCents,
    targetDate: record.targetDate,
    progressPercent: goalProgress(record.savedCents, record.targetCents),
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
    const { initialCents, ...fields } = input;
    const record = await this.deps.goals.insert(fields, {
      initialCents,
      initialDate: this.today(),
      createdAt: this.deps.now(),
    });
    return this.presentOne(record);
  }

  async update(id: string, fields: GoalFields): Promise<GoalItem> {
    const record = await this.deps.goals.update(id, fields);
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
    await this.requireGoal(goalId);
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

  private async presentOne(record: GoalRecord): Promise<GoalItem> {
    const [item] = await this.present([record]);
    if (!item) throw new Error(`A meta ${record.id} não foi montada`);
    return item;
  }

  // Duas consultas para todas as metas (sem N+1): os aportes recentes e os da janela do ritmo.
  private async present(records: readonly GoalRecord[]): Promise<GoalItem[]> {
    const today = this.today();
    const goalIds = records.map((record) => record.id);
    const [recent, pace] = await Promise.all([
      this.deps.goals.findRecentContributions(goalIds, RECENT_CONTRIBUTIONS_LIMIT),
      this.deps.goals.findPaceContributions(goalIds, subtractDays(today, PACE_WINDOW_DAYS)),
    ]);
    const recentByGoal = groupByGoal(recent);
    const paceByGoal = groupByGoal(pace);
    return records.map((record) =>
      toItem(
        record,
        { recent: recentByGoal.get(record.id) ?? [], pace: paceByGoal.get(record.id) ?? [] },
        today,
      ),
    );
  }
}
